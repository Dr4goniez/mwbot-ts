#!/bin/bash
set -euo pipefail

# Validate the command-line argument
readonly AUTH_METHOD="${1:-}"

die_with_usage() {
	echo "Usage: $0 {oauth2|oauth1|botpassword|anonymous}" >&2
	exit 1
}

case "$AUTH_METHOD" in
	oauth2|oauth1|botpassword|anonymous)
		# Valid input; Noop
		;;
	"")
		echo "Error: Authentication method is required." >&2
		die_with_usage
		;;
	*)
		echo "Error: Invalid authentication method: '${AUTH_METHOD}'" >&2
		die_with_usage
		;;
esac

# Recreate the test environment from scratch
docker compose down -v
docker compose up -d --build
mkdir -p secrets

# Wait until MariaDB is ready to accept connections
until docker compose exec database mariadb \
	-u mwbot_ts \
	-pmwbot_ts \
	-e "SELECT 1" \
	mwbot_ts >/dev/null 2>&1
do
	sleep 1
done

# Install MediaWiki
docker compose exec mediawiki php maintenance/run.php install \
	--server http://localhost:8080 \
	--dbuser mwbot_ts \
	--dbpass mwbot_ts \
	--dbname mwbot_ts \
	--dbserver database \
	--dbtype mysql \
	--installdbpass mwbot_ts \
	--installdbuser mwbot_ts \
	--scriptpath "" \
	--pass adminpassword \
	Wikipedia Admin

MSYS_NO_PATHCONV=1 docker compose exec -T mediawiki cp \
	/var/www/html/conf/LocalSettings.php \
	/var/www/html/LocalSettings.php

# Prepare authentication credentials for integration tests

# OAuth and BotPassword permissions used by the test account
readonly GRANTS="basic,blockusers,createaccount,createeditmovepage,delete,editinterface,editmycssjs,editmyoptions,editmywatchlist,editpage,editprotected,editsiteconfig,highvolume,import,mergehistory,oversight,patrol,privateinfo,protect,rollback,sendemail,uploadeditmovefile,uploadfile,viewdeleted,viewmywatchlist,viewrestrictedlogs"

# Convert the comma-separated permission list into repeated "--grants <permission>" arguments
IFS=',' read -r -a grant_list <<< "$GRANTS"
grant_args=()
for g in "${grant_list[@]}"; do
	grant_args+=("--grants" "$g")
done

update_db_schema() {
	docker compose exec mediawiki php maintenance/run.php update --quick
}

setup_oauth() {
	echo "Generating OAuth cryptographic keys..."
	docker compose exec -T mediawiki mkdir -p secrets
	docker compose exec -T mediawiki openssl genrsa -out secrets/oauth-private.key 2048
	docker compose exec -T mediawiki openssl rsa -in secrets/oauth-private.key -pubout -out secrets/oauth-public.key
	docker compose exec -T mediawiki chown -R www-data:www-data secrets/
	docker compose exec -T mediawiki chmod 600 secrets/oauth-private.key
	docker compose exec -T mediawiki chmod 600 secrets/oauth-public.key

	update_db_schema

	# OAuth consumer creation requires a confirmed email address
	docker compose exec -T mediawiki php maintenance/run.php eval <<'EOF'
$user = User::newFromName( 'Admin' );
$user->setEmail( 'mwbot-ts@wikiuser.com' );
$user->confirmEmail();
$user->saveSettings();
EOF
}

readonly OAUTH_RESULT_JSON="secrets/oauth_result.json"
create_oauth_consumer() {
	local -r oauth_version="$1"

	local oauth_extra_args=()
	if [[ "$oauth_version" == "2" ]]; then
		oauth_extra_args+=("--oauth2GrantTypes" "client_credentials")
	fi

	docker compose exec mediawiki php maintenance/run.php ./extensions/OAuth/maintenance/createOAuthConsumer \
		--name CI-Test-App \
		--callbackUrl "" \
		--description Owner-only consumer for CI \
		--user Admin \
		--version 1.0.0 \
		--oauthVersion "$oauth_version" \
		"${oauth_extra_args[@]}" \
		"${grant_args[@]}" \
		--ownerOnly \
		--approve \
		--jsonOnSuccess > "$OAUTH_RESULT_JSON"
}

get_json_value() {
	# Alternative to jq
	# shellcheck disable=SC2016
	node -e '
		const [file, key] = process.argv.slice(1);
		try {
			const fs = require("fs");
			const content = fs.readFileSync(file, "utf8");
			const obj = JSON.parse(content);
			if (!(key in obj)) {
				console.error(`Key "${key}" not found in ${file}`);
				process.exit(1);
			}
			console.log(obj[key]);
		} catch (err) {
			console.error(`Error processing JSON from ${file}: ${err.message}`);
			process.exit(1);
		}
	' "$1" "$2"
}

create_json_string() {
	# Alternative to jo
	node -e '
		const parseValue = (rawVal) => {
			if (rawVal === "true") return true;
			if (rawVal === "false") return false;
			if (rawVal === "null") return null;
			return rawVal;
		};
		const obj = Object.fromEntries(
			process.argv.slice(1).map(arg => {
				const idx = arg.indexOf("=");
				if (idx === -1) {
					// Treat arguments without "=" as boolean flags
					return [arg, true];
				}

				const key = arg.substring(0, idx);
				const rawVal = arg.substring(idx + 1);
				return [key, parseValue(rawVal)];
			})
		);
		console.log(JSON.stringify(obj));
	' "$@"
}

readonly RESPONSE_JSON="secrets/response.json"
case "$AUTH_METHOD" in
	oauth2)
		setup_oauth
		create_oauth_consumer "2"

		CLIENT_ID=$(get_json_value "$OAUTH_RESULT_JSON" "key")
		CLIENT_SECRET=$(get_json_value "$OAUTH_RESULT_JSON" "secret")

		echo "Fetching OAuth2 Access Token via Client Credentials grant..."
		docker compose exec -T mediawiki curl -fsS -X POST http://localhost/rest.php/oauth2/access_token \
			-d "grant_type=client_credentials" \
			-d "client_id=${CLIENT_ID}" \
			-d "client_secret=${CLIENT_SECRET}" > "$RESPONSE_JSON"

		ACCESS_TOKEN=$(get_json_value "$RESPONSE_JSON" "access_token")
		AUTH_CREDENTIALS=$(create_json_string oAuth2AccessToken="$ACCESS_TOKEN")
		readonly AUTH_CREDENTIALS

		rm -f "$OAUTH_RESULT_JSON" "$RESPONSE_JSON"
		;;
	oauth1)
		setup_oauth
		create_oauth_consumer "1"

		CONSUMER_ID=$(get_json_value "$OAUTH_RESULT_JSON" "id")
		CONSUMER_KEY=$(get_json_value "$OAUTH_RESULT_JSON" "key")
		CONSUMER_SECRET=$(get_json_value "$OAUTH_RESULT_JSON" "secret")

		# Note: eval.php is surprisingly sensitive to formatting. Keeping the script simple and
		# avoiding multiline method chains or complex control structures helps prevent parse errors.
		# shell.php would be a cleaner alternative, but it requires psy/psysh.
		echo "Fetching and hashing OAuth1 Access Tokens via MediaWiki database classes..."
		docker compose exec -T -e CONSUMER_ID="${CONSUMER_ID}" mediawiki php maintenance/run.php eval > "$RESPONSE_JSON" <<'PHP'
$consumerId = (int)getenv( 'CONSUMER_ID' );
$dbr = \MediaWiki\MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnection( \DB_REPLICA );
$row = $dbr->newSelectQueryBuilder()->fields( [ 'oaac_access_token', 'oaac_access_secret' ] )->table( 'oauth_accepted_consumer' )->where( [ 'oaac_consumer_id' => (int)$consumerId ] )->fetchRow();

$token = null;
$secret = null;
if ( $row ) $token = $row->oaac_access_token;
if ( $row ) $secret = \MediaWiki\Extension\OAuth\Backend\Utils::hmacDBSecret( $row->oaac_access_secret );

echo json_encode( [ 'accessToken' => $token, 'accessTokenSecret' => $secret ] );
PHP

		ACCESS_TOKEN=$(get_json_value "$RESPONSE_JSON" "accessToken")
		ACCESS_TOKEN_SECRET=$(get_json_value "$RESPONSE_JSON" "accessTokenSecret")
		AUTH_CREDENTIALS=$(create_json_string \
			consumerToken="$CONSUMER_KEY" \
			consumerSecret="$CONSUMER_SECRET" \
			accessToken="$ACCESS_TOKEN" \
			accessSecret="$ACCESS_TOKEN_SECRET"
		)
		readonly AUTH_CREDENTIALS

		rm -f "$OAUTH_RESULT_JSON" "$RESPONSE_JSON"
		;;
	botpassword)
		update_db_schema

		# Create a bot password for Admin and grant all available permissions
		BOT_PASSWORD="12345678901234567890123456789012"
		docker compose exec mediawiki php maintenance/run.php createBotPassword \
			--appid adminbot \
			--grants "$GRANTS" \
			Admin "$BOT_PASSWORD"

		AUTH_CREDENTIALS=$(create_json_string username="Admin@adminbot" password="$BOT_PASSWORD")
		readonly AUTH_CREDENTIALS
		;;
	anonymous)
		update_db_schema
		AUTH_CREDENTIALS=$(create_json_string anonymous)
		readonly AUTH_CREDENTIALS
		;;
	*)
		# Defensive fallback
		echo "Error: Invalid authorization method: '${AUTH_METHOD}'" >&2
		die_with_usage
		;;
esac

# Write credentials to credentials.json
readonly JSON_FILE="../integration/localwiki/credentials.json"
printf '%s\n' "$AUTH_CREDENTIALS" > "$JSON_FILE"

# Write authentication method to .env
readonly ENV_FILE="../integration/localwiki/.env"
cat << EOF > "$ENV_FILE"
# Automatically generated by setup.sh
AUTH_METHOD='${AUTH_METHOD}'
EOF

# Add interwiki entries for the local MediaWiki installation
# shellcheck disable=SC2016
readonly EN_SCRIPT_PATH='https://en.wikipedia.org/wiki/$1'
# shellcheck disable=SC2016
readonly SCRIPT_PATH='http://localhost:8080/index.php/$1'
readonly API_PATH='http://localhost:8080/api.php'
docker compose exec -T database \
	mariadb \
	-umwbot_ts \
	-pmwbot_ts \
	mwbot_ts <<EOF
INSERT IGNORE INTO interwiki
	(iw_prefix, iw_url, iw_api, iw_wikiid, iw_local, iw_trans)
VALUES
	('w', '${EN_SCRIPT_PATH}', '', '', 0, 0),
	('en', '${EN_SCRIPT_PATH}', '', '', 0, 0),
	('trans', '${SCRIPT_PATH}', '', '', 0, 1),
	('mwbot_ts', '${SCRIPT_PATH}', '${API_PATH}', '', 1, 0);
EOF

echo "Setup complete. Credentials saved to ${JSON_FILE} and authentication method to ${ENV_FILE}"

# Proceed with setting up test data
MSYS_NO_PATHCONV=1 docker compose exec mediawiki bash /tmp/setup-testdata.sh