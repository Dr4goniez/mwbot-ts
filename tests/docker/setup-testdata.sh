#!/bin/bash
set -euo pipefail

create_page() {
	local -r PAGE="$1"
	php maintenance/run.php edit -a --createonly "$PAGE" <<< 'dummy content'
}

echo 'Creating an existing page for create() tests...'
create_page Create_existing_page

echo 'Creating an existing page for save() tests...'
create_page Save_existing_page

echo 'Creating an existing page for edit() tests...'
create_page Edit_existing_page

echo 'Creating an existing page for newSection() tests...'
create_page Talk:NewSection

echo 'Creating an existing page with an associated talk page for move() tests...'
create_page Move_from
create_page Talk:Move_from

echo 'Creating two existing pages for read() tests...'
create_page Read_1
create_page Read_2

echo 'Blocking 2.2.2.2 for unblock() tests...'
php maintenance/run.php blockUsers \
	--allow-email \
    --allow-talkedit \
    --disable-autoblock \
    --disable-hardblock \
	<<< '2.2.2.2'