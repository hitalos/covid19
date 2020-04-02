const svg = d3.select('#map')
const g = svg.append('g')
const gPolygons = g.append('g')
const gTexts = g.append('g')
const gScale = svg.append('g').attr('transform', 'translate(900, 400)')
const options = { sortField: 'confirmed', sortDesc: true }
const tooltip = d3.select('.col').insert('div').classed('tooltip', true).style('opacity', 0)

const nome = (d) => d.properties.nome || d.properties.state
const codarea = (d) => d.properties.codarea
const confirmed = (d) => d.properties.confirmed || 0
const confirmedF = (d) => formatN(d.properties.confirmed || 0)
const deaths = (d) => d.properties.deaths || 0
const deathsF = (d) => formatN(d.properties.deaths || 0)
const lastUpdate = (d) => d.properties.lastUpdate
const populacao = (d) => d.properties.populacao || 0
const populacaoF = (d) => formatN(d.properties.populacao || 0)
const xValues = (data) => data.map(confirmed)
const formatN = (str) => d3.format(',')(str).replace(/,/g, '.')

const hideTooltip = () => tooltip.transition().duration(1000).style('opacity', 0)

const showTooltip = (mountTextTooltip) => (text) => {
	tooltip.transition().style('opacity', 0.9)
		.style('left', () => (d3.event.pageX)+'px')
		.style('top', () => (d3.event.pageY)+'px')
	tooltip.html(mountTextTooltip(text))
}

const calcProjection = (data) => {
	const points = data.filter((d) => d.type).map(d => {
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

const paintScale = (xValues) => {
	const [min, max] = d3.extent(xValues)
	const values = d3.range(0, 5).reverse().map((n) => Math.round((max * n / 5)) + min)
	const format = (str) => d3.format(',.1r')(str).replace(/,/g, '.')
	const color = d3.scaleLinear().domain(d3.extent(values)).range(['#ffeecc', 'darkred'])
	const gValue = gScale.selectAll('g').data(values).enter().append('g')

	gValue.append('rect')
		.attr('y', (_, i) => (i * 12))
		.attr('width', 10).attr('height', 10)
		.style('stroke', 'black').style('stroke-opacity', 0.5)
		.style('fill', color)

	gValue.append('text')
		.attr('dy', '1em')
		.attr('x', 15)
		.attr('y', (_, i) => (i * 12))
		.style('text-anchor', 'start')
		.text(format)
}

const mountTable = (data) => {
	const val = (d) => d.properties[options.sortField]
	const localData = data.sort((a, b) => options.sortDesc ? val(b) - val(a) : val(a) - val(b))

	const trsEnter = d3.select('#tbl').select('tbody').selectAll('tr')
		.data(localData, codarea).enter().append('tr')

	trsEnter.append('td').classed('local', true).text(nome)
	trsEnter.append('td').classed('confirmed', true).text(confirmedF)
	trsEnter.append('td').classed('deaths', true).text(deathsF)
	trsEnter.append('td').classed('lastUpdate', true).text(lastUpdate)
	trsEnter.append('td').text(populacaoF)

	const trs = d3.select('#tbl').select('tbody').selectAll('tr')
	trs.selectAll('td.local').text(nome)
	trs.selectAll('td.confirmed').text(confirmedF)
	trs.selectAll('td.lastUpdate').text(lastUpdate)
	trs.selectAll('td.deaths').text(deathsF)
}

const mountPaths = (data, path, mountTooltip) => {
	const color = d3.scaleLinear().domain(d3.extent(xValues(data))).range(['#ffeecc', 'darkred'])
	gPolygons.selectAll('path').data(data, codarea).enter()
		.append('path')
		.attr('d', path)
		.style('fill', (d) => confirmed(d) === 0 ? null : color(confirmed(d)))
		.on('mousemove', showTooltip(mountTooltip))
		.on('mouseout', hideTooltip)

	gPolygons.selectAll('path')
		.transition().duration(1000)
		.style('fill', (d) => confirmed(d) === 0 ? null : color(confirmed(d)))

		gPolygons.selectAll('path').on('click', (d) => {
			if (d.properties.state) {
				window.location = `/estados.html?UF=${d.properties.state}`
				return
			}
			showTooltip(mountTooltip)(d)
		})
}

const IsChangedField = (field, cb) => (d, i, nodes) => {
	const n = parseInt(nodes.item(i).textContent, 10) || 0
	if (d.properties[field] !== n) {
		return cb(d, i, nodes)
	}
}

const mountTexts = (data, projection) => {
	const IsChangedField = (field, defaultValue, tempValue) => (d, i, nodes) => {
		const n = parseInt(nodes[i].textContent, 10) || 0
		return d.properties[field] !== n ? tempValue : defaultValue
	}
	const centerX = (d) => projection(d3.geoCentroid(d))[0]
	const centerY = (d) => projection(d3.geoCentroid(d))[1]

	gTexts.selectAll('text')
		.data(data, codarea).enter()
		.append('text')
		.attr('x', centerX)
		.attr('y', centerY)
		.attr('dy', '0.33em')
		.style('font-size', '0.5em')
		.text((d) => confirmed(d) > 0 ? confirmed(d) : '')

	gTexts.selectAll('text')
		.transition().duration(1000)
		.style('fill', IsChangedField('confirmed', 'black', 'red'))
		.style('font-size', IsChangedField('confirmed', '0.5em', '1.5em'))
		.transition().duration(1500)
		.style('fill', 'black')
		.style('font-size', '0.5em')

	gTexts.selectAll('text')
		.text((d) => confirmed(d) > 0 ? confirmed(d) : '')
}

const zoomCtl = (g) => {
	const zoom = d3.zoom()
		.on('zoom', () => { g.attr('transform', d3.event.transform) })
		.scaleExtent([1, 6])
		.translateExtent([[0, 0], [960, 500]])
	svg.call(zoom)
	d3.select('#zoom')
		.select('button')
		.on('click', () => g.call(zoom.transform, d3.zoomIdentity))
}

const mountTotals = (data) => {
	d3.select('#totals').select('.confirmed').text(() => {
		const confirmedTotal = data.map(confirmed).reduce((accum, i) => accum + i, 0)
		return `Total de confirmações: ${confirmedTotal}`
	})
	d3.select('#totals').select('.deaths').text(() => {
		const deathsTotal = data.map(deaths).reduce((accum, i) => accum + i, 0)
		return `Total de mortes: ${deathsTotal}`
	})
}

const render = (data, imported, mountTextTooltip) => {
	const projection = calcProjection(data)
	const path = d3.geoPath().projection(projection)

	mountPaths(data, path, mountTextTooltip)
	mountTexts(data, projection)
	zoomCtl(g)
	paintScale(xValues(data))
	if (imported.properties.confirmed) {
		mountTable([...data, imported])
		mountTotals([...data, imported])
		return
	}
	mountTable(data)
	mountTotals(data)
}
