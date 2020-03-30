#!/bin/bash

curl "https://servicodados.ibge.gov.br/api/v2/malhas/?formato=application/vnd.geo+json&resolucao=2" > dados/brasil.json
