"""Pack a validated, fitted SF3D mesh and source-camera UVs for synchronous use.

Inputs are explicit: no network, image painting, or geometry reconstruction.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path

import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--rig-data', type=Path, required=True)
p.add_argument('--projection', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
rig = json.loads(a.rig_data.read_text())
projection = json.loads(a.projection.read_text())
count = len(rig['positions']) // 3
triangles = np.asarray(rig['indices'], dtype='<u2').reshape(-1, 3)
head = set(projection['head_triangles'])
# Native-pose ray checks identified a small connected jaw patch whose valid
# source-camera UVs were rejected by the original front-normal visibility gate.
# Change only its material partition; source UVs and geometry remain exact.
jaw_patch = {4487, 4525, 8671, 8695, 8697}
if rig['calibration']['sourceGlbSha256'] != 'e1626717a21f414519ccaf17066e7fd0c2b36d40e64fbf0269e67dc0547baf06':
    raise ValueError('Revalidate source-specific jaw partition for the new GLB')
head |= jaw_patch
front = set(projection['front_body_triangles']) - head
rest = np.asarray(rig['positions'], dtype=np.float64).reshape(-1, 3)
centers = rest[triangles].mean(axis=1)
rear_head = set(np.flatnonzero((centers[:,1] > 1.91) & (centers[:,2] < .08))) - head - front
if head & front or max(head | front) >= len(triangles):
    raise ValueError('Invalid projected triangle partition')
groups, ordered = [], []
for material, selection in enumerate([
    [i for i in range(len(triangles)) if i not in head | front | rear_head],
    sorted(front), sorted(head), sorted(rear_head),
]):
    values = triangles[selection].ravel().tolist()
    groups.append(dict(start=len(ordered), count=len(values), material=material))
    ordered.extend(values)
if len(ordered) != triangles.size:
    raise ValueError('Triangle partition changed geometry')

packed = {}
specs = {}
# The temporary rigging reference uses a compact bun. Seat it under the final
# long-hair scalp without changing the eyes, nose, lips or facial outline.
positions = np.asarray(rig['positions'], dtype=np.float64).reshape(-1, 3).copy()
normals = np.asarray(rig['normals'], dtype=np.float64).reshape(-1, 3).copy()
bun = positions[:, 1] > 2.10
delta = positions[bun, 1] - 2.10
t = np.clip(delta / .04, 0, 1)
positions[bun, 1] = 2.10 + np.where(delta < .04,
    delta - .80 * .04 * (t**3 - .5*t**4), .024 + .20*(delta-.04))
spread = 1 - .15*(t*t*(3-2*t))
positions[bun, 0] *= spread
positions[bun, 2] = .025 + (positions[bun, 2]-.025)*spread
# Reduce only the rear/side bun behind the facial surface. Its painted scalp
# remains the foundation for long native fibers, so no opaque hood is needed.
rear = (rest[:,1] > 2.02) & (rest[:,2] < .05)
ty = np.clip((rest[rear,1]-2.02)/.05, 0, 1)
tz = np.clip((.05-rest[rear,2])/.06, 0, 1)
strength = ty*ty*(3-2*ty)*tz*tz*(3-2*tz)
current = positions[rear].copy()
target = current.copy()
target[:,0] = np.sign(current[:,0]) * np.where(np.abs(current[:,0])>.085,
    .085+(np.abs(current[:,0])-.085)*.25, np.abs(current[:,0]))
target[:,2] = np.where(current[:,2]<-.06, -.06+(current[:,2]+.06)*.25, current[:,2])
positions[rear] += (target-current)*strength[:,None]
edited = bun | rear
accum = np.zeros_like(positions)
face_normals = np.cross(positions[triangles[:,1]]-positions[triangles[:,0]],
                        positions[triangles[:,2]]-positions[triangles[:,0]])
for corner in range(3):
    np.add.at(accum, triangles[:,corner], face_normals)
length = np.linalg.norm(accum[edited], axis=1)
normals[edited] = accum[edited] / np.maximum(length[:,None], 1e-12)
def pack(name, values, dtype, scale=1):
    raw = np.asarray(values, dtype=np.float64)
    if not np.isfinite(raw).all():
        raise ValueError(f'Nonfinite {name}')
    values = np.rint(raw * scale)
    limits = np.iinfo(dtype)
    if values.min() < limits.min or values.max() > limits.max:
        raise ValueError(f'Out-of-range {name}')
    packed[name] = base64.b64encode(values.astype(dtype).tobytes()).decode()
    specs[name] = [dtype, scale]

pack('positions', positions.ravel(), '<i2', 10000)
pack('normals', normals.ravel(), '<i2', 32767)
pack('uvs', rig['uvs'], '<u2', 65535)
pack('sourceUVs', np.clip(projection['source_uv_gltf'], 0, 1).ravel(), '<u2', 65535)
pack('indices', ordered, '<u2')
pack('skinIndices', rig['skinIndices'], '|u1')
pack('skinWeights', rig['skinWeights'], '<u2', 65535)
source = dict(kind='image-to-3D', sourceUrl='https://huggingface.co/spaces/stabilityai/stable-fast-3d',
              sourceGlbSha256=rig['calibration']['sourceGlbSha256'],
              vertices=count, triangles=len(triangles), forward='+Z', up='+Y',
              reference='user-approved adult queen reference; separately reconstructed animation body',
              frontJawTriangleOverrides=sorted(jaw_patch),
              bunCleanup={'enabled': True, 'aboveY': 2.10, 'originalNormalizationHeight': 2.2476,
                          'rearEnvelope': True, 'preservedCentralFace': True})
meta = {k: rig[k] for k in ['joints', 'boneNames', 'calibration']}
meta.update(groups=groups, source=source)
js = '''/** Image-reconstructed queen. Original topology; fitted 16-bone skin.
 * UV0 and UV1 retain glTF TOPDOWN orientation: texture.flipY=false.
 * Packed positions: .0001 game units; normals/UVs/weights: 16 bit.
 * Rebuild with scripts/build-overlord-queen.py and the recorded explicit inputs. */
'''
js += 'export const QUEEN_BODY_SOURCE=Object.freeze(' + json.dumps(source, separators=(',', ':')) + ');\n'
js += 'const meta=' + json.dumps(meta, separators=(',', ':')) + ';\n'
js += 'const packed=' + json.dumps(packed, separators=(',', ':')) + ';\n'
js += 'const specs=' + json.dumps(specs, separators=(',', ':')) + ';\n'
js += '''let cache;
export function decodeOverlordQueen(){
 if(cache)return cache;
 const result={...meta};
 for(const [name,encoded]of Object.entries(packed)){
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),[kind,scale]=specs[name];
  const raw=kind==='|u1'?bytes:kind==='<i2'?new Int16Array(bytes.buffer):new Uint16Array(bytes.buffer);
  result[name]=scale===1?raw:Float32Array.from(raw,n=>n/scale);
 }
 cache=result;return result;
}
'''
a.output.parent.mkdir(parents=True, exist_ok=True)
a.output.write_text(js)
print(json.dumps(dict(vertices=count, triangles=len(triangles), bytes=a.output.stat().st_size,
                      sha256=hashlib.sha256(js.encode()).hexdigest())))
