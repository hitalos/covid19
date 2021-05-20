#!/bin/bash

## ADD THIS SCRIPT TO CRON

STATES='AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'
DIR='.'
TEMP=$(mktemp)
if [[ "$1" != "" ]]; then
	DIR=$1
fi
if [[ "$2" != "" ]]; then
	STATES=$2
fi

lastMonths=$(date --date="-1 month" +%Y-%m\|)$(date +%Y-%m)

REPO=$DIR/dados
curl -sS 'https://data.brasil.io/dataset/covid19/caso.csv.gz' | gzip -d > "$TEMP"
echo "date,state,confirmed,deaths,is_last,estimated_population,city_ibge_code" > "$REPO/casos.csv"
awk "BEGIN { FS=\",\"; OFS=\",\" } /($lastMonths).*state/ { print \$1,\$2,\$5,\$6,\$8,\$10,\$11 }" "$TEMP" >> "$REPO/casos.csv"
gzip -9 -k -f "$REPO/casos.csv"

for UF in $STATES; do
	echo "Filtrando dados de $UF..."
	echo "date,state,city,confirmed,deaths,is_last" > "$REPO/$UF/casos.csv"
	awk "BEGIN { FS=\",\"; OFS=\",\" } /($lastMonths).*,$UF,.*,city/ { print \$1,\$2,\$3,\$5,\$6,\$8 }" "$TEMP" >> "$REPO/$UF/casos.csv"
	gzip -9 -k -f "$REPO/$UF/casos.csv"
done

rm "$TEMP"
