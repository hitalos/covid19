#!/bin/bash

wget "https://servicodados.ibge.gov.br/api/v2/malhas/BR?formato=application/vnd.geo+json&resolucao=2" -O dados/brasil.json.gz
rm -f dados/brasil.json && gzip -d dados/brasil.json.gz
