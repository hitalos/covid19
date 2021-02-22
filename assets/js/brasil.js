((d3) => {
	const ufs = [
		{ uf: 'AC', cod: '12' }, { uf: 'AL', cod: '27' }, { uf: 'AM', cod: '13' }, { uf: 'AP', cod: '16' }, { uf: 'BA', cod: '29' },
		{ uf: 'CE', cod: '23' }, { uf: 'DF', cod: '53' }, { uf: 'ES', cod: '32' }, { uf: 'GO', cod: '52' }, { uf: 'MA', cod: '21' },
		{ uf: 'MG', cod: '31' }, { uf: 'MS', cod: '50' }, { uf: 'MT', cod: '51' }, { uf: 'PA', cod: '15' }, { uf: 'PB', cod: '25' },
		{ uf: 'PE', cod: '26' }, { uf: 'PI', cod: '22' }, { uf: 'PR', cod: '41' }, { uf: 'RJ', cod: '33' }, { uf: 'RN', cod: '24' },
		{ uf: 'RO', cod: '11' }, { uf: 'RR', cod: '14' }, { uf: 'RS', cod: '43' }, { uf: 'SC', cod: '42' }, { uf: 'SE', cod: '28' },
		{ uf: 'SP', cod: '35' }, { uf: 'TO', cod: '17' },
	]
	const imported = { properties: {} }

	const mountTextTooltip = (ev, d) => {
		if (confirmed(d) && confirmed(d) !== 0) {
			const tx = confirmed(d) !== 0 ? Math.round((deaths(d) / confirmed(d)) * 10000) / 100 : 0
			return `<strong>${nome(d)}</strong><br>
				<strong>Casos confirmados:</strong> ${formatN(confirmed(d))}<br>
				<strong>Mortes:</strong> ${formatN(deaths(d))}<br>
				<strong>Proporção de mortes:</strong> ${tx}%<br>
				<strong>População estimada:</strong> ${populacaoF(d)}<br>
				<strong>Última atualização:</strong> ${lastUpdate(d)}`
		}
		return `<strong>${nome(d)}</strong><br>
			<strong>População estimada:</strong> ${populacaoF(d)}`
	}

	const prepareData = (data, cases) => {
		data.forEach(({ properties }) => {
			const c = cases.filter(uf => uf.city_ibge_code === properties.codarea && uf.is_last === 'True')
			if (!properties.state || properties.state === '') {
				properties.state = ufs.filter(uf => uf.cod === properties.codarea)[0].uf
			}
			if (c.length > 0) {
				properties.confirmed = parseInt(c[0].confirmed, 10) || 0
				properties.deaths = parseInt(c[0].deaths, 10) || 0
				properties.populacao = parseInt(c[0].estimated_population, 10) || 0
				properties.lastUpdate = c[0].date.split('-').reverse().join('/')
				return
			}
			if (properties.confirmed === undefined) properties.confirmed = 0
			if (properties.deaths === undefined) properties.deaths = 0
			if (properties.populacao === undefined) properties.populacao = 0
		})
		data.sort((a, b) => confirmed(b) - confirmed(a))
	}

	Promise.all([
		d3.json('dados/brasil.json'),
		d3.csv('dados/casos.csv'),
	]).then(([data, cases]) => {
		prepareData(data.features, cases)
		renderMap(data.features, imported, mountTextTooltip)
		renderGraph(cases)

		setInterval(() => {
			d3.csv('dados/casos.csv').then((cases) => {
				prepareData(data.features, cases)
				renderMap(data.features, imported, mountTextTooltip)
				renderGraph(cases)
			})
		}, 30000)
	})
})(d3)
