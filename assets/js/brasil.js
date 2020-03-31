(async (d3) => {
	const ufs = [
		{ uf: 'AC', cod: '12' }, { uf: 'AL', cod: '27' }, { uf: 'AM', cod: '13' }, { uf: 'AP', cod: '16' }, { uf: 'BA', cod: '29' },
		{ uf: 'CE', cod: '23' }, { uf: 'DF', cod: '53' }, { uf: 'ES', cod: '32' }, { uf: 'GO', cod: '52' }, { uf: 'MA', cod: '21' },
		{ uf: 'MG', cod: '31' }, { uf: 'MS', cod: '50' }, { uf: 'MT', cod: '51' }, { uf: 'PA', cod: '15' }, { uf: 'PB', cod: '25' },
		{ uf: 'PE', cod: '26' }, { uf: 'PI', cod: '22' }, { uf: 'PR', cod: '41' }, { uf: 'RJ', cod: '33' }, { uf: 'RN', cod: '24' },
		{ uf: 'RO', cod: '11' }, { uf: 'RR', cod: '14' }, { uf: 'RS', cod: '43' }, { uf: 'SC', cod: '42' }, { uf: 'SE', cod: '28' },
		{ uf: 'SP', cod: '35' }, { uf: 'TO', cod: '17' },
	]

	const svg = d3.select('#map')
	const g = svg.append('g')
	const gPolygons = g.append('g')
	const gTexts = g.append('g')
	const gScale = svg.append('g').attr('transform', 'translate(900, 400)')
	const tooltip = d3.select('.col').insert('div').classed('tooltip', true).style('opacity', 0)
	const formatN = (str) => d3.format(',')(str).replace(/,/g, '.')

	const calcProjection = ({ features }) => {
		const points = features.map(d => {
			return d.geometry.type === 'Polygon' ? d.geometry.coordinates[0] : d.geometry.coordinates[0][0]
		}).reduce((accum, d) => [...accum, ...d], [])
		const bounds = ((d) => [
			[d3.min(d.map(x => x[0])), d3.min(d.map(y => y[1]))],
			[d3.max(d.map(x => x[0])), d3.max(d.map(y => y[1]))],
		])(points)
		const scale = 480 / (Math.abs(bounds[0][1] - bounds[1][1]) / 360) / 2 / Math.PI
		const center = [
			bounds[0][0] + (bounds[1][0] - bounds[0][0]) / 2,
			bounds[1][1] + (bounds[0][1] - bounds[1][1]) / 2
		]
		return d3.geoMercator().center(center).scale(scale)
	}

	const showTooltip = ({ properties }) => {
		tooltip.transition().style('opacity', 0.9)
			.style('left', () => (d3.event.pageX)+'px')
			.style('top', () => (d3.event.pageY)+'px')

		if (properties.confirmed && properties.confirmed !== 0) {
			const { state: s, confirmed: c, deaths: d, population: p, lastUpdate: l } = properties
			const tx = c !== 0 ? Math.round((d / c) * 10000) / 100 : 0
			tooltip.html(
				`<strong>${s}</strong><br>
				<strong>Casos confirmados:</strong> ${c}<br>
				<strong>Mortes:</strong> ${d}<br>
				<strong>Proporção de mortes:</strong> ${tx}%<br>
				<strong>População estimada:</strong> ${formatN(p)}<br>
				<strong>Última atualização:</strong> ${l}`
			)
			return
		}
		tooltip.html(
			`<strong>${properties.state}</strong><br>
			<strong>População estimada:</strong> ${formatN(properties.population)}`
		)
	}

	const hideTooltip = () => tooltip.transition().duration(1000).style('opacity', 0)

	const IsChangedField = (field, cb) => (d, i, nodes) => {
		const n = parseInt(nodes.item(i).textContent, 10) || 0
		if (d.properties[field] !== n) {
			return cb(d, i, nodes)
		}
	}

	const prepareData = (data, cases) => {
		data.features.forEach(({ properties }) => {
			const c = cases.filter(uf => uf.city_ibge_code === properties.codarea)
			if (!properties.state || properties.state === '') {
				properties.state = ufs.filter(uf => uf.cod === properties.codarea)[0].uf
			}
			if (c.length > 0) {
				properties.confirmed = parseInt(c[0].confirmed, 10) || 0
				properties.deaths = parseInt(c[0].deaths, 10) || 0
				properties.population = parseInt(c[0].estimated_population_2019, 10) || 0
				properties.lastUpdate = c[0].date.split('-').reverse().join('/')
				return
			}
			if (properties.confirmed === undefined) properties.confirmed = 0
			if (properties.deaths === undefined) properties.deaths = 0
			if (properties.population === undefined) properties.population = 0
		})
		data.features.sort((a, b) => b.properties.confirmed - a.properties.confirmed)
		data.xValues = data.features.map((d) => d.properties.confirmed)
	}

	const paintScale = (xValues) => {
		const [min, max] = d3.extent(xValues)
		const values = d3.range(0, 5).reverse().map((n) => Math.round(max * n / 5) + min)
		const format = (str) => d3.format(',.1r')(str).replace(/,/g, '.')
		const color = d3.scaleLinear().domain(d3.extent(values)).range(['#ffeecc', 'darkred'])
		const gValue = gScale.selectAll('g')
			.data(values)
			.enter()
			.append('g')

		gValue.append('rect')
			.attr('y', (_, i) => (i * 12))
			.attr('width', 10).attr('height', 10)
			.attr('stroke', 'black').attr('stroke-opacity', 0.5)
			.attr('fill', color)

		gValue.append('text')
			.attr('x', 15)
			.attr('y', (_, i) => (i * 12))
			.attr('style', 'text-anchor: start')
			.attr('dy', '1em')
			.text(format)
	}

	const mountTable = ({ features }) => {
		const trsEnter = d3.select('#tbl').select('tbody').selectAll('tr')
			.data(features, (d) => d.properties.state)
			.enter()
			.append('tr')

		trsEnter.append('td').attr('class', 'state').text((d) => d.properties.state)
		trsEnter.append('td').attr('class', 'confirmed').text((d) => formatN(d.properties.confirmed))
		trsEnter.append('td').attr('class', 'deaths').text((d) => formatN(d.properties.deaths || 0))
		trsEnter.append('td').attr('class', 'lastUpdate').text((d) => d.properties.lastUpdate)
		trsEnter.append('td').text((d) => formatN(d.properties.population))

		const trs = d3.select('#tbl').select('tbody').selectAll('tr')
		trs.selectAll('td.state').text((d) => d.properties.state)
		trs.selectAll('td.confirmed').text((d) => d.properties.confirmed)
		trs.selectAll('td.lastUpdate').text((d) => d.properties.lastUpdate)
		trs.selectAll('td.deaths').text((d) => d.properties.deaths || 0)
	}

	const mountTotals = ({ features }) => {
		d3.select('#totals').select('.confirmed').text(() => {
			const confirmed = features.map((uf) => uf.properties.confirmed || 0).reduce((accum, i) => accum + i, 0)
			return `Total de confirmações: ${confirmed}`
		})
		d3.select('#totals').select('.deaths').text(() => {
			const deaths = features.map((uf) => uf.properties.deaths || 0).reduce((accum, i) => accum + i, 0)
			return `Total de mortes: ${deaths}`
		})
	}

	const mountPaths = (data, path) => {
		const color = d3.scaleLinear().domain(d3.extent(data.xValues)).range(['#ffeecc', 'darkred'])
		gPolygons.selectAll('path')
			.data(data.features, (d) => d.properties.codarea)
			.enter()
			.append('path')

		gPolygons.selectAll('path')
			.attr('d', path)
			.attr('style', (d) => d.properties.confirmed === 0 ? null : `fill: ${color(d.properties.confirmed)}`)
			.on('mousemove', showTooltip)
			.on('mouseout', hideTooltip)

		gPolygons.selectAll('path').on('click', (d) => { window.location = `/estados.html?UF=${d.properties.state}` })

		gPolygons.selectAll('path').transition().duration(1000)
			.attr('style', (d) => d.properties.confirmed === 0 ? null : `fill: ${color(d.properties.confirmed)}`)
	}

	const mountTexts = ({ features }, projection) => {
		const textsEnter = gTexts.selectAll('text')
			.data(features, (d) => d.properties.codarea)
			.enter()
			.append('text')

		textsEnter.attr('x', (d) => projection(d3.geoCentroid(d))[0])
			.attr('y', (d) => projection(d3.geoCentroid(d))[1])
			.attr('dy', '0.33em')
			.text((d) => d.properties.confirmed)

		const texts = gTexts.selectAll('text')
		texts.attr('style', 'font-size: 0.5em')
			.transition().duration(1000)
			.attr('fill', IsChangedField('confirmed', () => 'red'))
			.attr('style', IsChangedField('confirmed', () => 'font-size: 2em'))
			.transition().duration(1500)
			.attr('fill', 'black')
			.attr('style', IsChangedField('confirmed', () => 'font-size: 0.5em'))

		texts.text((d) => d.properties.confirmed)
	}

	const zoomCtl = () => {
		const zoom = d3.zoom().on('zoom', () => { g.attr('transform', d3.event.transform) })
		svg.call(zoom)
		d3.select('#zoom').select('button').on('click', () => g.call(zoom.transform, d3.zoomIdentity))
	}

	const render = (data) => {
		const projection = calcProjection(data)
		const path = d3.geoPath().projection(projection)

		mountPaths(data, path)
		mountTexts(data, projection)
		zoomCtl()
		paintScale(data.xValues)
		mountTable(data)
		mountTotals(data)
	}

	Promise.all([
		d3.json('dados/brasil.json'),
		d3.csv('dados/casos.csv'),
	]).then(([data, cases]) => {
		prepareData(data, cases)
		render(data)

		setInterval(() => {
			d3.csv('dados/casos.csv').then((cases) => {
				prepareData(data, cases)
				render(data)
			})
		}, 30000)
	})
})(d3)
