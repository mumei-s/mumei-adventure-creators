#!/usr/bin/env python3
"""Build the Overlord's compact, native anatomical body from CC0 MakeHuman data.

Inputs are the original hm08 base.obj and caucasian-female-young.target files.
Their SHA-256 checks prevent silently regenerating from a different basemesh.
No downloaded model/helper mesh is copied into the published application.

Example (from a workspace with the two source files already downloaded):
  python build-overlord-human.py --source-dir /path/to/makehuman \
    --source-url <pinned-upstream-tree-URL> --source-commit <upstream-commit>

Only OBJ group `body` is retained. Native facial/eyelid topology and OBJ UVs
survive extraction. Vertex normals are averaged before UV seam duplication,
so texture boundaries do not introduce visible lighting seams.
"""

from __future__ import annotations

import argparse
import array
import base64
import hashlib
import json
import math
import pathlib
import sys


BASE_SHA256 = 'e290dc75241b3933c5ac5576bf20b65c9fd5f6e14451e0286b49272559434a95'
TARGET_SHA256 = '6340a99bb37de74b073ce7e0ba1f347c8785fbce3adb93f12320512885bdbe1f'
BASE_GIT_BLOB = 'd26635e9326e3cca30778fd7b9c00062b03cce09'
GROUND_Y = -8.1899
MODEL_SCALE = .14
POSITION_QUANTIZATION = 10000


def read_checked(path: pathlib.Path, expected_sha: str) -> str:
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != expected_sha:
        raise ValueError(f'{path.name}: expected SHA-256 {expected_sha}, got {digest}')
    return data.decode('utf-8')


def parse_obj(text: str):
    vertices, uvs, groups = [], [], {}
    group = None
    for line in text.splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        if fields[0] == 'v':
            vertices.append([float(x) for x in fields[1:4]])
        elif fields[0] == 'vt':
            uvs.append([float(x) for x in fields[1:3]])
        elif fields[0] == 'g':
            group = fields[1]
        elif fields[0] == 'f':
            face = []
            for value in fields[1:]:
                pair = value.split('/')
                face.append((int(pair[0]) - 1, int(pair[1]) - 1))
            groups.setdefault(group, []).append(face)
    return vertices, uvs, groups


def encode(values, kind):
    packed = array.array(kind, values)
    if sys.byteorder != 'little':
        packed.byteswap()
    return base64.b64encode(packed.tobytes()).decode('ascii')


def normalized(value):
    return [value[0] * MODEL_SCALE, (value[1] - GROUND_Y) * MODEL_SCALE, value[2] * MODEL_SCALE]


def build(source_dir: pathlib.Path, source_url: str, source_commit: str) -> tuple[str, dict]:
    base = read_checked(source_dir / 'base.obj', BASE_SHA256)
    target = read_checked(source_dir / 'caucasian-female-young.target', TARGET_SHA256)
    if 'explicitly released as CC0' not in base or 'explicitly released as CC0' not in target:
        raise ValueError('The source files must include their explicit CC0 release notice')
    vertices, uvs, groups = parse_obj(base)
    for line in target.splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        index = int(fields[0])
        for axis in range(3):
            vertices[index][axis] += float(fields[axis + 1])

    body_faces = groups['body']
    if len(vertices) != 19158 or len(body_faces) != 13378:
        raise ValueError('Unexpected hm08 body topology')
    body_ids = sorted({v for face in body_faces for v, _ in face})
    scaled = {i: normalized(vertices[i]) for i in body_ids}
    triangles = []
    for face in body_faces:
        for k in range(1, len(face) - 1):
            triangles.append((face[0], face[k], face[k + 1]))

    # Area-weighted normals on the continuous anatomical mesh, before UV cuts.
    normals = {i: [0., 0., 0.] for i in body_ids}
    for triangle in triangles:
        a, b, c = [scaled[item[0]] for item in triangle]
        ab, ac = [[p - q for p, q in zip(point, a)] for point in (b, c)]
        cross = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]]
        for vertex_id, _ in triangle:
            for axis in range(3):
                normals[vertex_id][axis] += cross[axis]
    for index, vector in normals.items():
        length = math.sqrt(sum(x*x for x in vector))
        if length <= 1e-12:
            raise ValueError(f'Zero-length normal at body vertex {index}')
        normals[index] = [x / length for x in vector]

    seam_map, seam_vertices, indices = {}, [], []
    for triangle in triangles:
        for pair in triangle:
            if pair not in seam_map:
                seam_map[pair] = len(seam_vertices)
                seam_vertices.append(pair)
            indices.append(seam_map[pair])
    if len(seam_vertices) > 65535:
        raise ValueError('The compact mesh must fit Uint16 indices')
    positions, packed_normals, packed_uvs = [], [], []
    for vertex_id, uv_id in seam_vertices:
        positions.extend(round(x * POSITION_QUANTIZATION) for x in scaled[vertex_id])
        packed_normals.extend(round(x * 32767) for x in normals[vertex_id])
        packed_uvs.extend(round(max(0, min(1, x)) * 65535) for x in uvs[uv_id])
    if max(abs(x) for x in positions) > 32767:
        raise ValueError('Position quantization exceeded Int16 range')

    # Separate CC0 eye surfaces fill the real eyelid sockets. They stay in the
    # same normalized world coordinates; the caller can parent them to a head
    # bone, or translate the geometry by that bone's bind-position.
    eyes = {}
    for side in ('left', 'right'):
        faces = groups['helper-' + side[0] + '-eye']
        eye_ids = sorted({v for face in faces for v, _ in face})
        eye_points = {i: normalized(vertices[i]) for i in eye_ids}
        eye_triangles = [(face[0], face[k], face[k + 1]) for face in faces for k in range(1, len(face) - 1)]
        eye_normals = {i: [0., 0., 0.] for i in eye_ids}
        for tri in eye_triangles:
            a, b, c = [eye_points[item[0]] for item in tri]
            ab, ac = [[p - q for p, q in zip(point, a)] for point in (b, c)]
            cross = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]]
            for i, _ in tri:
                for axis in range(3):
                    eye_normals[i][axis] += cross[axis]
        for i, vector in eye_normals.items():
            length = math.sqrt(sum(x*x for x in vector))
            eye_normals[i] = [x / max(1e-12, length) for x in vector]
        eye_map, eye_vertices, eye_indices = {}, [], []
        for tri in eye_triangles:
            for pair in tri:
                if pair not in eye_map:
                    eye_map[pair] = len(eye_vertices)
                    eye_vertices.append(pair)
                eye_indices.append(eye_map[pair])
        ep, en, euv = [], [], []
        for i, j in eye_vertices:
            ep.extend(round(x * POSITION_QUANTIZATION) for x in eye_points[i])
            en.extend(round(x * 32767) for x in eye_normals[i])
            euv.extend(round(max(0, min(1, x)) * 65535) for x in uvs[j])
        eyes[side] = {'positions':encode(ep, 'h'), 'normals':encode(en, 'h'),
                      'uvs':encode(euv, 'H'), 'indices':encode(eye_indices, 'H'),
                      'vertices':len(eye_vertices), 'triangles':len(eye_triangles)}

    joints = {}
    joint_aliases = {
        'pelvis':'pelvis', 'spine-4':'spine4', 'spine-3':'spine3',
        'spine-2':'spine2', 'spine-1':'spine1', 'neck':'neck',
        'head':'head', 'head-2':'headTop', 'jaw':'jaw', 'mouth':'mouth',
        'l-eye':'leftEye', 'r-eye':'rightEye',
    }
    for prefix, side in [('l', 'left'), ('r', 'right')]:
        for suffix, name in [('clavicle','Clavicle'), ('scapula','Scapula'),
                             ('shoulder','Shoulder'), ('elbow','Elbow'),
                             ('hand','Hand'), ('hand-2','HandMiddle'),
                             ('hand-3','HandTip'), ('upper-leg','Hip'),
                             ('knee','Knee'), ('ankle','Ankle'),
                             ('foot-1','Foot'), ('foot-2','Toe'),
                             ('lowerlid','LowerLid'), ('upperlid','UpperLid')]:
            joint_aliases[f'{prefix}-{suffix}'] = side + name
    for source_name, name in joint_aliases.items():
        ids = {v for face in groups['joint-' + source_name] for v, _ in face}
        center = [sum(vertices[i][axis] for i in ids) / len(ids) for axis in range(3)]
        joints[name] = [round(x, 8) for x in normalized(center)]

    bounds = [[min(scaled[i][axis] for i in body_ids) for axis in range(3)],
              [max(scaled[i][axis] for i in body_ids) for axis in range(3)]]
    metadata = {
        'license':'CC0-1.0', 'sourceUrl':source_url, 'sourceCommit':source_commit,
        'baseSha256':BASE_SHA256, 'targetSha256':TARGET_SHA256,
        'baseGitBlob':BASE_GIT_BLOB,
        'originalBodyVertices':len(body_ids), 'vertices':len(seam_vertices),
        'triangles':len(triangles), 'bounds':bounds,
        'scale':MODEL_SCALE, 'groundY':GROUND_Y, 'positionQuantization':POSITION_QUANTIZATION,
        'forward':'+Z', 'up':'+Y', 'leftSide':'+X',
        'eyes':{side:{k:v for k,v in item.items() if k in ('vertices','triangles')} for side,item in eyes.items()},
    }
    lines = [
        '/** Native anatomical Overlord body derived from MakeHuman hm08.',
        ' * Source body and caucasian-female-young morph explicitly released under CC0-1.0 (September 2020).',
        ' * Original copyright holders: Data Collection AB, Joel Palmius, Jonas Hauquier;',
        ' * original female target copyright: Manuel Bastioni (2014), transferred in 2016.',
        f' * Upstream: {source_url}',
        f' * Source commit: {source_commit}',
        ' * Rebuild with ../scripts/build-overlord-human.py; SHA-256 inputs are pinned there.',
        f' * Base OBJ Git blob: {BASE_GIT_BLOB}',
        ' * Continuous body plus separate eye surfaces; clothing and other helpers omitted.',
        ' * Quantization: 0.0001 game units; UV/normal precision: 16 bit. */',
        'export const HUMAN_BODY_SOURCE=Object.freeze(' + json.dumps(metadata, separators=(',', ':')) + ');',
        'export const HUMAN_JOINTS=Object.freeze(' + json.dumps(joints, separators=(',', ':')) + ');',
        'const EYES=' + json.dumps(eyes, separators=(',', ':')) + ';',
    ]
    for name, values, kind in [('POSITIONS',positions,'h'), ('NORMALS',packed_normals,'h'),
                               ('UVS',packed_uvs,'H'), ('INDICES',indices,'H')]:
        lines.append(f'const {name}="{encode(values, kind)}";')
    lines.extend([
        '',
        'function unpack16(encoded,signed=false){',
        ' const binary=atob(encoded),bytes=new Uint8Array(binary.length);',
        ' for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);',
        ' const view=new DataView(bytes.buffer),values=signed?new Int16Array(bytes.length/2):new Uint16Array(bytes.length/2);',
        ' for(let i=0;i<values.length;i++)values[i]=signed?view.getInt16(i*2,true):view.getUint16(i*2,true);',
        ' return values;',
        '}',
        '/** Fresh arrays: callers may deform one actor without changing another. */',
        'function decodeMesh(packed){',
        ' const p=unpack16(packed.positions,true),n=unpack16(packed.normals,true),uv=unpack16(packed.uvs);',
        ' const positions=Float32Array.from(p,x=>x/10000),normals=Float32Array.from(n,x=>x/32767),uvs=Float32Array.from(uv,x=>x/65535);',
        ' return {positions,normals,uvs,indices:unpack16(packed.indices)};',
        '}',
        'export function decodeOverlordHuman(){',
        ' const body=decodeMesh({positions:POSITIONS,normals:NORMALS,uvs:UVS,indices:INDICES});',
        ' return {...body,eyes:{left:decodeMesh(EYES.left),right:decodeMesh(EYES.right)},joints:HUMAN_JOINTS,metadata:HUMAN_BODY_SOURCE};',
        '}',
        'function makeGeometry(THREE,data){',
        ' const geometry=new THREE.BufferGeometry();',
        ' geometry.setAttribute("position",new THREE.BufferAttribute(data.positions,3));',
        ' geometry.setAttribute("normal",new THREE.BufferAttribute(data.normals,3));',
        ' geometry.setAttribute("uv",new THREE.BufferAttribute(data.uvs,2));',
        ' geometry.setIndex(new THREE.BufferAttribute(data.indices,1));',
        ' geometry.computeBoundingBox();geometry.computeBoundingSphere();',
        ' geometry.userData.anatomicalSource=HUMAN_BODY_SOURCE;',
        ' return geometry;',
        '}',
        '/** Continuous native anatomical topology, including modelled facial features and eyelids. */',
        'export function createOverlordHumanGeometry(THREE){return makeGeometry(THREE,decodeOverlordHuman());}',
        'export function createOverlordEyeGeometries(THREE){',
        ' return {left:makeGeometry(THREE,decodeMesh(EYES.left)),right:makeGeometry(THREE,decodeMesh(EYES.right))};',
        '}',
        '',
    ])
    return '\n'.join(lines), metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=pathlib.Path, required=True)
    parser.add_argument('--source-url', required=True, help='Pinned upstream source-tree URL for the attribution header')
    parser.add_argument('--source-commit', required=True, help='Exact upstream source commit')
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1] / 'maze/overlord-human-data.js')
    parser.add_argument('--check', action='store_true', help='Verify the generated module without writing it')
    args = parser.parse_args()
    output, metadata = build(args.source_dir, args.source_url, args.source_commit)
    if args.check:
        if not args.output.exists() or args.output.read_text() != output:
            raise SystemExit(f'{args.output}: generated model is stale')
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    print(json.dumps({'output':str(args.output), 'bytes':len(output.encode()), **metadata}))


if __name__ == '__main__':
    main()
