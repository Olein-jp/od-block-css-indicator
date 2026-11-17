#!/usr/bin/env python3
"""実際に無効化して公開出力・保存済みCSS・設定保持を検証する。"""
import json
import os
import subprocess
import urllib.request

base = os.environ.get('WP_BASE_URL', 'http://localhost:8892')
plugin = 'od-block-css-indicator'

def wp(*args):
    result = subprocess.run(['node_modules/.bin/wp-env', 'run', 'cli', 'wp', *args],
                            text=True, capture_output=True, check=True)
    lines = result.stdout.splitlines()
    return next(line.removeprefix('OD_RESULT:') for line in lines if line.startswith('OD_RESULT:')) if any(line.startswith('OD_RESULT:') for line in lines) else result.stdout

content = '<!-- wp:paragraph {"style":{"css":"color:rgb(120,50,60);"}} --><p class="has-custom-css">OD CSS non-interference</p><!-- /wp:paragraph -->'
post_id = None
try:
    encoded = json.dumps(content, ensure_ascii=False)
    post_id = wp('eval', '$id=wp_insert_post(array("post_title"=>"OD CSS non-interference","post_status"=>"publish","post_content"=>' + encoded + ')); echo "OD_RESULT:".$id;', '--user=admin').strip()
    before = urllib.request.urlopen(f'{base}/?p={post_id}').read()
    saved_before = wp('eval', f'echo "OD_RESULT:".base64_encode(get_post({int(post_id)})->post_content);')
    meta_before = wp('eval', 'echo "OD_RESULT:".wp_json_encode(get_user_meta(1,"_od_block_css_indicator_settings",true));')
    wp('plugin', 'deactivate', plugin)
    after = urllib.request.urlopen(f'{base}/?p={post_id}').read()
    saved_after = wp('eval', f'echo "OD_RESULT:".base64_encode(get_post({int(post_id)})->post_content);')
    meta_after = wp('eval', 'echo "OD_RESULT:".wp_json_encode(get_user_meta(1,"_od_block_css_indicator_settings",true));')
    assert before == after, '有効／無効で公開HTMLが異なる'
    assert saved_before == saved_after, '保存本文が異なる'
    assert meta_before == meta_after, 'ユーザー設定が異なる'
    assert b'od-block-css-indicator/build' not in before, '公開ページに独自アセットがある'
    assert b'od-block-css-indicator--highlighted' not in before, '公開ページに独自クラスがある'
    assert b'color:rgb(120,50,60)' in before, '標準追加CSSが出力されていない'
    print('成功: 実際の無効化前後で公開HTML・保存CSS・ユーザー設定が一致し、独自アセットも存在しない')
finally:
    wp('plugin', 'activate', plugin)
    if post_id:
        wp('post', 'delete', post_id, '--force')
