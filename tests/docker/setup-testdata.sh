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