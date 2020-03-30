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

curl -sS -o "$TEMP" 'https://brasil.io/dataset/covid19/caso?place_type=state&is_last=True&format=csv' &&	cp "$TEMP" "$REPO/casos.csv"

for UF in $STATES; do
	echo "Baixando $UF..."
	curl -sS -o "$TEMP" "https://brasil.io/dataset/covid19/caso?state=$UF&place_type=city&is_last=True&format=csv"
	SIZE=$(stat -c '%s' "$TEMP")
	if [[ "$SIZE" != "0" ]]; then
		cp "$TEMP" "$REPO/$UF/casos.csv"
	fi
done
