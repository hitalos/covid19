#!/bin/bash

UF=$1
N=$2
if [[ "$UF" == "" ]]; then
	echo "Provide two-letters of UF like 'AL'"
	exit 1
fi

if [[ "$N" == "" ]]; then
	echo "Provide two-digits IBGE code of UF like '27'"
	exit 1
fi

mkdir dados/$UF

curl -s "https://servicodados.ibge.gov.br/api/v2/malhas/$N/?formato=application/vnd.geo+json&resolucao=5" > dados/$UF/municipios.json
curl -s "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2019/variaveis/9324?localidades=N6\[N3\[$N\]\]\|N3\[$N\]" > dados/$UF/demographic.json
