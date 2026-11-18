"""One-time Tower transfer, using psql service entries tower_legacy and tower_muumei.

Use Python 3 and psycopg 3. `check` rehearses and rolls back, `copy` imports,
and `verify` compares both databases. Run the final copy and verification once
legacy intake is quiet. Opening intake is a separate deployment step.
"""

import argparse
import sys

import psycopg


SOURCE_REF = 'xxhaerjvrgmnadxjqetz'
TARGET_REF = 'slamzhgsawfnmwlejgqp'

# Column lists are shared by COPY, insertion and comparison. Nothing else in
# either project participates, and no room credentials are written to a dump.
TABLES = {
    'rooms': ('creator_tower', 'id,note_id,note_user,slot,owner_hash,profile,design,avatar_mime,avatar_b64,avatar_version,version,joined_at'),
    'stamps': ('creator_tower', 'room_id,visitor_id,kind'),
    'challenges': ('creator_tower', 'hash,code,note_id,note_user,slot,expires_at,room_id'),
    'counter': ('tower_visit_private', 'singleton,total,visit_day,added_today'),
    'seen': ('tower_visit_private', 'visit_day,token'),
}


class TransferError(Exception):
    pass


def project_connection(service, expected_ref):
    db = psycopg.connect(service=service, sslmode='verify-full', connect_timeout=10, autocommit=True)
    host = db.info.host.lower()
    direct = host == f'db.{expected_ref}.supabase.co'
    pooled = host.endswith('.pooler.supabase.com') and db.info.user.endswith('.' + expected_ref)
    if not (direct or pooled):
        db.close()
        raise TransferError(f'The {service} connection does not match the expected project.')
    return db


def has_difference(db, left, right):
    return db.execute(f'SELECT EXISTS ({left} EXCEPT {right})').fetchone()[0]


def transfer(source, target, mode):
    with source.transaction(), target.transaction(force_rollback=mode != 'copy'):
        source.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        for db in (source, target):
            db.execute("SET LOCAL search_path TO pg_catalog, pg_temp")
            db.execute("SET LOCAL lock_timeout TO '3s'")
            db.execute("SET LOCAL TIME ZONE 'UTC'")
            db.execute("SET LOCAL DateStyle TO 'ISO, YMD'")
        if target.execute('SELECT ready FROM creator_tower.publication_state WHERE singleton FOR UPDATE').fetchone() != (False,):
            raise TransferError('The destination must have a closed Tower intake.')

        cutoff = source.execute('SELECT transaction_timestamp()').fetchone()[0]
        # Apply the identical cutoff to both views even when a code expires in transit.
        for db in (source, target):
            db.execute("SELECT set_config('tower.transfer_cutoff', %s, true)", (cutoff.isoformat(),))
        active = " WHERE expires_at > current_setting('tower.transfer_cutoff')::timestamptz"
        for name, (schema, cols) in TABLES.items():
            table = f'{schema}.{name}'
            keep = active if name == 'challenges' else ''
            if name == 'seen':
                keep = ' WHERE visit_day = (SELECT visit_day FROM tower_visit_private.counter WHERE singleton)'
            target.execute(f'CREATE TEMP TABLE import_{name} (LIKE {table}) ON COMMIT DROP')
            with source.cursor().copy(f'COPY (SELECT {cols} FROM {table}{keep}) TO STDOUT') as reader:
                with target.cursor().copy(f'COPY pg_temp.import_{name} ({cols}) FROM STDIN') as writer:
                    for block in reader:
                        writer.write(block)

        # A counter call can write even before enrollment opens. Exclude changes
        # during the comparison and never overwrite an independently used counter.
        tables = ', '.join(f'{schema}.{name}' for name, (schema, _) in TABLES.items())
        target.execute(f'LOCK TABLE {tables} IN SHARE ROW EXCLUSIVE MODE')
        if target.execute('SELECT count(*) FROM pg_temp.import_counter').fetchone() != (1,):
            raise TransferError('The legacy visit counter is missing.')
        for name, (schema, cols) in TABLES.items():
            table = f'{schema}.{name}'
            incoming = f'SELECT {cols} FROM pg_temp.import_{name}'
            existing = f'SELECT {cols} FROM {table}' + (active if name == 'challenges' else '')
            if name == 'seen':
                existing += ' WHERE visit_day = (SELECT visit_day FROM pg_temp.import_counter)'
            if name == 'counter' and mode != 'verify':
                target.execute('''UPDATE tower_visit_private.counter AS dst
                    SET total=src.total, visit_day=src.visit_day, added_today=src.added_today
                    FROM pg_temp.import_counter AS src WHERE dst.singleton AND src.singleton
                    AND dst.total=0 AND dst.added_today=0 AND NOT EXISTS (SELECT 1 FROM tower_visit_private.seen)''')
            if has_difference(target, existing, incoming):
                raise TransferError(f'The destination has different {name}. The transfer was rolled back.')
            if mode != 'verify':
                target.execute(f'INSERT INTO {table} ({cols}) {incoming} EXCEPT {existing}')
            if has_difference(target, incoming, existing):
                raise TransferError(f'The destination is missing or differs in {name}.')
        return target.execute('SELECT count(*) FROM pg_temp.import_rooms').fetchone()[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('check', 'copy', 'verify'))
    mode = parser.parse_args().mode
    try:
        with project_connection('tower_legacy', SOURCE_REF) as source, project_connection('tower_muumei', TARGET_REF) as target:
            count = transfer(source, target, mode)
    except TransferError as exc:
        sys.exit(str(exc))
    except psycopg.Error as exc:
        # Error details can include private row values or ownership hashes.
        sys.exit('Tower transfer failed. Database status: ' + (exc.sqlstate or 'connection unavailable'))
    print(f'Tower transfer {mode} passed for {count} rooms.')


if __name__ == '__main__':
    main()
