(async (d3) => {
	const params = new URLSearchParams(window.location.search)
	const UF = params.get('UF')

	const svg = d3.select('#map')
	const g = svg.append('g')
	const gPolygons = g.append('g')
	const gTexts = g.append('g')
	const gScale = svg.append('g').attr('transform', 'translate(900, 400)')
	const tooltip = d3.select('.col').insert('div').classed('tooltip', true).style('opacity', 0)
	const formatN = (str) => d3.format(',')(str).replace(/,/g, '.')

	const calcProjection = (data) => {
		const points = data.map(d => {
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
			const { nome: n, populacao: p, confirmed: c, deaths: d, lastUpdate: l } = properties
			const tx = c !== 0 ? Math.round((d / c) * 10000) / 100 : 0
			tooltip.html(
				`<strong>${n}</strong><br>
				<strong>Casos confirmados:</strong> ${c}<br>
				<strong>Mortes:</strong> ${d}<br>
				<strong>População estimada:</strong> ${formatN(p)}<br>
				<strong>Última atualização:</strong> ${l}<br>
				<strong>Proporção de mortes: ${tx}%`
			)
			return
		}
		tooltip.html(
			`<strong>${properties.nome}</strong><br>
			<strong>População estimada:</strong> ${formatN(properties.populacao)}`
		)
	}

	const hideTooltip = () => tooltip.transition().duration(1000).style('opacity', 0)

	const IsChangedField = (field, cb) => (d, i, nodes) => {
		const n = parseInt(nodes.item(i).textContent, 10) || 0
		if (d.properties[field] !== n) {
			return cb(d, i, nodes)
		}
	}

	const prepareData = (data, demographicData, covid19) => {
		const cases = covid19.filter(m => m.state === UF && m.is_last === 'True' && m.place_type === 'city')
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
		data.sort((a, b) => b.properties.confirmed - a.properties.confirmed)
	}

	const paintScale = (xValues) => {
		const [min, max] = d3.extent(xValues)
		const values = d3.range(0, 5).reverse().map((n) => Math.round((max * n / 5)) + min)
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

	const mountTable = (data) => {
		const trsEnter = d3.select('#tbl').select('tbody').selectAll('tr')
			.data(data, (d) => d.properties.codarea)
			.enter()
			.append('tr')

		trsEnter.append('td').attr('class', 'city').text((d) => d.properties.nome)
		trsEnter.append('td').attr('class', 'confirmed').text((d) => formatN(d.properties.confirmed))
		trsEnter.append('td').attr('class', 'deaths').text((d) => formatN(d.properties.deaths || 0))
		trsEnter.append('td').attr('class', 'lastUpdate').text((d) => d.properties.lastUpdate)
		trsEnter.append('td').text((d) => formatN(d.properties.populacao))

		const trs = d3.select('#tbl').select('tbody').selectAll('tr')
		trs.selectAll('td.city').text((d) => d.properties.nome.replace(new RegExp(` - ${UF}`, 'g'), ''))
		trs.selectAll('td.confirmed').text((d) => d.properties.confirmed)
		trs.selectAll('td.lastUpdate').text((d) => d.properties.lastUpdate)
		trs.selectAll('td.deaths').text((d) => d.properties.deaths || 0)
	}

	const mountTotals = (data) => {
		d3.select('#totals').select('.confirmed').text(() => {
			const confirmed = data.map((uf) => uf.properties.confirmed || 0).reduce((accum, i) => accum + i, 0)
			return `Total de confirmações: ${confirmed}`
		})
		d3.select('#totals').select('.deaths').text(() => {
			const deaths = data.map((uf) => uf.properties.deaths || 0).reduce((accum, i) => accum + i, 0)
			return `Total de mortes: ${deaths}`
		})
		d3.select('#totals').select('.lastUpdate').text(`Última atualização: ${data[0].properties.lastUpdate}`)
	}

	const mountPaths = (data, path) => {
		const color = d3.scaleLinear().domain(d3.extent(xValues(data))).range(['#ffeecc', 'darkred'])
		gPolygons.selectAll('path')
			.data(data, (d) => d.properties.codarea)
			.enter()
			.append('path')
			.attr('d', path)
			.attr('style', (d) => d.properties.confirmed === 0 ? null : `fill: ${color(d.properties.confirmed)}`)
			.on('mousemove', showTooltip)
			.on('mouseout', hideTooltip)

		gPolygons.selectAll('path')
			.transition().duration(1000)
			.attr('style', (d) => d.properties.confirmed === 0 ? null : `fill: ${color(d.properties.confirmed)}`)
	}

	const mountTexts = (data, projection) => {
		gTexts.selectAll('text')
			.data(data, (d) => d.properties.codarea)
			.enter()
			.append('text')
			.attr('x', (d) => projection(d3.geoCentroid(d))[0])
			.attr('y', (d) => projection(d3.geoCentroid(d))[1])
			.attr('dy', '0.33em')
			.text((d) => d.properties.confirmed > 0 ? d.properties.confirmed : '')

		gTexts.selectAll('text')
			.attr('style', 'font-size: 0.5em')
			.transition().duration(1000)
			.attr('fill', IsChangedField('confirmed', () => 'red'))
			.attr('style', IsChangedField('confirmed', () => 'font-size: 2em'))
			.transition().duration(1500)
			.attr('fill', 'black')
			.attr('style', IsChangedField('confirmed', () => 'font-size: 0.5em'))

		gTexts.selectAll('text')
			.text((d) => d.properties.confirmed > 0 ? d.properties.confirmed : '')
	}

	const zoomCtl = () => {
		const zoom = d3.zoom().on('zoom', () => { g.attr('transform', d3.event.transform) })
		svg.call(zoom)
		d3.select('#zoom').select('button').on('click', () => g.call(zoom.transform, d3.zoomIdentity))
	}

	const xValues = (data) => data.map((m) => m.properties.confirmed)

	const render = (data) => {
		const projection = calcProjection(data)
		const path = d3.geoPath().projection(projection)

		mountPaths(data, path)
		mountTexts(data, projection)
		zoomCtl()
		paintScale(xValues(data))
		mountTable(data)
		mountTotals(data)
	}

	Promise.all([
		d3.json('dados/' + UF + '/municipios.json'),
		d3.json('dados/' + UF + '/demographic.json'),
		d3.csv('dados/' + UF + '/casos.csv'),
	]).then(([{ features }, [demographicData], cases]) => {
		prepareData(features, demographicData, cases)
		render(features)

		setInterval(() => {
			d3.csv('dados/' + UF + '/casos.csv').then((cases) => {
				prepareData(features, demographicData, cases)
				render(features)
			})
		}, 30000)
	})
})(d3)
