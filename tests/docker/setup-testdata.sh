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

echo 'Creating an existing page for delete() tests...'
create_page Delete_existing_page

readonly UNDELETE='Undelete_deleted_page'
echo 'Creating and deleting a page for undelete() tests...'
create_page "$UNDELETE"
php maintenance/run.php deleteBatch <<< "$UNDELETE"

echo 'Creating an existing page for protect() tests...'
create_page Protect_existing_page

readonly UNPROTECT='Unprotect_existing_page'
echo 'Creating and protecting an existing page for unprotect() tests...'
create_page "$UNPROTECT"
php maintenance/run.php protect "$UNPROTECT"

readonly ROLLBACK='Rollback_existing_page'
echo 'Creating an existing page and adding a second revision for rollback() tests...'
create_page "$ROLLBACK"
php maintenance/run.php edit -u Admin "$ROLLBACK" <<< $'dummy content\n\ndummy content'