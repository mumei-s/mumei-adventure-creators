"""Exercise the one-time transfer with two disposable PostgreSQL databases."""

import psycopg

from migrate_tower_intake import TransferError, transfer


def scalar(db, query):
    return db.execute(query).fetchone()[0]


def expect_failure(source, target, mode, message):
    try:
        transfer(source, target, mode)
    except TransferError as exc:
        assert message in str(exc), str(exc)
    else:
        raise AssertionError('Expected the transfer guard to stop this operation.')


with psycopg.connect(dbname='tower_legacy_ci', autocommit=True) as source, psycopg.connect(dbname='tower_ci', autocommit=True) as target:
    source.execute('''INSERT INTO creator_tower.rooms
        (note_id,note_user,slot,owner_hash,profile,design,avatar_mime,avatar_b64,avatar_version)
        SELECT 'fixture_'||i,'fixture-'||i,i,repeat(i::text,64),jsonb_build_object('name',E'Card\\n\\\\.'),
        '{"avatarMode":"custom","engineer":true}', 'image/webp','eA==',1 FROM generate_series(1,2) i''')
    source.execute('''INSERT INTO creator_tower.stamps SELECT r.id,v.id,'hello' FROM creator_tower.rooms r,
        creator_tower.rooms v WHERE r.slot=1 AND v.slot=2''')
    source.execute('''INSERT INTO creator_tower.challenges(hash,code,note_id,note_user,expires_at)
        VALUES (repeat('a',64),'AT-CURRENT','fixture_3','fixture-3',now()+interval '1 hour'),
            (repeat('b',64),'AT-EXPIRED','fixture_old','fixture-old',now()-interval '1 hour')''')
    source.execute('UPDATE tower_visit_private.counter SET total=17,added_today=1')
    source.execute('''INSERT INTO tower_visit_private.seen
        SELECT visit_day,repeat('c',64) FROM tower_visit_private.counter''')

    assert transfer(source, target, 'check') == 2
    assert scalar(target, 'SELECT count(*) FROM creator_tower.rooms') == 0
    expect_failure(source, target, 'verify', 'rooms')
    assert transfer(source, target, 'copy') == 2
    assert transfer(source, target, 'copy') == 2
    assert transfer(source, target, 'verify') == 2
    assert scalar(target, "SELECT owner_hash=repeat('1',64) AND avatar_b64='eA==' FROM creator_tower.rooms WHERE slot=1")
    assert scalar(target, 'SELECT count(*) FROM creator_tower.stamps') == 1
    assert scalar(target, 'SELECT code FROM creator_tower.challenges') == 'AT-CURRENT'
    assert scalar(target, 'SELECT total FROM tower_visit_private.counter') == 17
    assert scalar(target, 'SELECT count(*) FROM tower_visit_private.seen') == 1
    assert scalar(source, 'SELECT count(*) FROM creator_tower.challenges') == 2
    assert not scalar(target, 'SELECT ready FROM creator_tower.publication_state')

    # A mismatch after room insertion must roll back that earlier step too.
    source.execute('''INSERT INTO creator_tower.rooms(note_id,note_user,slot,owner_hash,profile,design)
        VALUES ('fixture_3','fixture-3',3,repeat('3',64),'{}','{}')''')
    target.execute("UPDATE creator_tower.stamps SET kind='read'")
    expect_failure(source, target, 'copy', 'stamps')
    assert scalar(target, 'SELECT count(*) FROM creator_tower.rooms') == 2
    assert scalar(target, 'SELECT kind FROM creator_tower.stamps') == 'read'
    target.execute("UPDATE creator_tower.stamps SET kind='hello'")
    assert transfer(source, target, 'copy') == 3
    target.execute('UPDATE creator_tower.publication_state SET ready=true')
    expect_failure(source, target, 'copy', 'closed Tower intake')

print('Private move-in records, media, stamps and visits survived the rehearsal, retries and rollback.')
