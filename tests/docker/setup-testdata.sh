#!/bin/bash
set -euo pipefail

echo 'Creating an existing page for create() tests...'
php maintenance/run.php edit -a --createonly Create_existing_page <<< 'dummy content'

echo 'Creating an existing page for save() tests...'
php maintenance/run.php edit -a --createonly Save_existing_page <<< 'dummy content'

echo 'Creating an existing page for edit() tests...'
php maintenance/run.php edit -a --createonly Edit_existing_page <<< 'dummy content'

echo 'Creating an existing page for newSection() tests...'
php maintenance/run.php edit -a --createonly Talk:NewSection <<< 'dummy content'

echo 'Creating an existing page with an associated talk page for move() tests...'
php maintenance/run.php edit -a --createonly Move_from <<< 'dummy content'
php maintenance/run.php edit -a --createonly Talk:Move_from <<< 'dummy content'

echo 'Creating two existing pages for read() tests...'
php maintenance/run.php edit -a --createonly Read_1 <<< 'dummy content'
php maintenance/run.php edit -a --createonly Read_2 <<< 'dummy content'