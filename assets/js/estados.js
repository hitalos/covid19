((d3) => {
	const params = new URLSearchParams(window.location.search)
	const UF = params.get('UF')
	const imported = { properties: {} }

	const mountTextTooltip = (d) => {
		if (confirmed(d) && confirmed(d) !== 0) {
			const tx = confirmed(d) !== 0 ? Math.round((deaths(d) / confirmed(d)) * 10000) / 100 : 0
			return `<strong>${nome(d)}</strong><br>
				<strong>Casos confirmados:</strong> ${confirmedF(d)}<br>
				<strong>Mortes:</strong> ${deathsF(d)}<br>
				<strong>População estimada:</strong> ${populacaoF(d)}<br>
				<strong>Última atualização:</strong> ${lastUpdate(d)}<br>
				<strong>Proporção de mortes: ${tx}%`
		}
		return `<strong>${nome(d)}</strong><br>
			<strong>População estimada:</strong> ${populacaoF(d)}`
	}

	const prepareData = (data, demographicData, covid19) => {
		const cases = covid19.filter(m => m.state === UF && m.is_last === 'True' && m.place_type === 'city')
		const [importedCases] = cases.filter(m => m.city === "Importados/Indefinidos")
		imported.properties = {
			codarea: 0,
			nome: 'Importados ou indefinidos',
			confirmed: importedCases ? +importedCases.confirmed : 0,
			deaths: importedCases ? +importedCases.deaths : 0,
			lastUpdate: importedCases ? importedCases.date.split('-').reverse().join('/') : 'n/a',
			populacao: 0,
		}
		const { series } = demographicData.resultados[0]
		data.forEach(({ properties }) => {
			series.forEach((s) => {
				if (s.localidade.id === properties.codarea) {
					properties.nome = s.localidade.nome.replace(new RegExp(` - ${UF}`,'g'), '')
					properties.populacao = parseInt(s.serie['2019'], 10)
					const c = cases.filter(m => s.localidade.nome === `${m.city} - ${m.state}`)
					if (c.length != 0) {
						properties.confirmed = parseInt(c[0].confirmed, 10) || 0
						properties.deaths = parseInt(c[0].deaths, 10) || 0
						properties.lastUpdate = c[0].date.split('-').reverse().join('/')
						return
					}
					properties.confirmed = 0
					properties.deaths = 0
					properties.lastUpdate = 'n/a'
				}
			})
		})
	}

	Promise.all([
		d3.json('dados/' + UF + '/municipios.json'),
		d3.json('dados/' + UF + '/demographic.json'),
		d3.csv('dados/' + UF + '/casos.csv'),
	]).then(([data, [demographicData], cases]) => {
		prepareData(data.features, demographicData, cases)
		renderMap(data.features, imported, mountTextTooltip)
		renderGraph(cases)

		setInterval(() => {
			d3.csv('dados/' + UF + '/casos.csv').then((cases) => {
				prepareData(data.features, demographicData, cases)
				renderMap(data.features, imported, mountTextTooltip)
				renderGraph(cases)
			})
		}, 30000)
	})
})(d3)
