#!/bin/bash
set -euo pipefail

echo 'Creating existing page for create() tests...'
php maintenance/run.php edit -a --createonly Create_existing_page <<< 'dummy content'