#!/bin/bash
set -euo pipefail

docker compose down -v
docker compose up -d

# Ensure the DB is ready before proceeding
until docker compose exec database mariadb \
	-u mwbot_ts \
	-pmwbot_ts \
	-e "SELECT 1" \
	mwbot_ts >/dev/null 2>&1
do
	sleep 1
done

docker compose exec mediawiki php maintenance/run.php install \
	--server=http://localhost:8080 \
	--dbuser=mwbot_ts \
	--dbpass=mwbot_ts \
	--dbname=mwbot_ts \
	--dbserver=database \
	--dbtype=mysql \
	--installdbpass=mwbot_ts \
	--installdbuser=mwbot_ts \
	--scriptpath="" \
	--pass=adminpassword \
	"mwbot-ts testwiki" Admin

docker compose exec mediawiki php maintenance/run.php update --quick

# Create a bot password for Admin and grant all available permissions
docker compose exec mediawiki php maintenance/run.php createBotPassword \
	--appid=adminbot \
	--grants=basic,blockusers,createaccount,createeditmovepage,delete,editinterface,editmycssjs,editmyoptions,editmywatchlist,editpage,editprotected,editsiteconfig,highvolume,import,mergehistory,oversight,patrol,privateinfo,protect,rollback,sendemail,uploadeditmovefile,uploadfile,viewdeleted,viewmywatchlist,viewrestrictedlogs \
	Admin 12345678901234567890123456789012