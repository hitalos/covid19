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

REPO=$DIR/dados

curl -sS 'https://data.brasil.io/dataset/covid19/caso.csv.gz' | gzip -d > "$TEMP"
grep 'state' "$TEMP" > "$REPO/casos.csv"

for UF in $STATES; do
	echo "Filtrando dados de $UF..."
	echo "date,state,city,place_type,confirmed,deaths,order_for_place,is_last,estimated_population_2019,city_ibge_code,confirmed_per_100k_inhabitants,death_rate" > "$REPO/$UF/casos.csv"
	grep ",$UF," "$TEMP" | grep 'city' | while read -r LINE; do
		echo "$LINE" >> "$REPO/$UF/casos.csv"
	done
done

rm "$TEMP"
