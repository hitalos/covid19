const svg = d3.select('#map')
const g = svg.append('g')
const gPolygons = g.append('g')
const gTexts = g.append('g')
const gScale = svg.append('g')
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

const showTooltip = (mountTextTooltip) => (d, i, nodes) => {
	tooltip.transition().style('opacity', 0.9)
		.style('left', () => {
			if (d3.event.type === 'mouseover') return d3.event.pageX + 'px'
			if (nodes[i].nodeName === 'path') {
				const { x, width } = nodes[i].getBBox()
				return `${x + width}px`
			}
			return '50%'
		})
		.style('top', () => {
			if (d3.event.type === 'mouseover') return d3.event.pageY + 'px'
			if (nodes[i].nodeName === 'path') {
				const { y, height } = nodes[i].getBBox()
				return `${y + height}px`
			}
			return '50%'
		})
	tooltip.html(mountTextTooltip(d, i, nodes))
}

const paintScale = (xValues, height) => {
	const color = (_, n) => d3.scaleLinear().domain([5, 0]).range(['#ffeecc', 'darkred'])(n)
	const scale = d3.scaleLinear().domain([d3.max(xValues), 0]).range([0, 42])
	const axis = d3.axisRight(scale).ticks(6, ',.1r')

	gScale.call(axis)
		.classed('scale', true)
		.attr('transform', `translate(10, ${height - 150}) scale(2)`)
		.selectAll('line, path, rect').remove()

	gScale.selectAll('g')
		.append('rect')
		.attr('width', 5).attr('height', 5)
		.attr('transform', 'translate(2, -2)')
		.style('stroke', 'black')
		.style('stroke-width', 0.5)
		.style('stroke-opacity', 0.25)

	gScale.selectAll('rect')
		.style('fill', color)
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
		.attr('tabindex', 0)
		.style('fill', (d) => confirmed(d) === 0 ? null : color(confirmed(d)))
		.on('mouseover', showTooltip(mountTooltip))
		.on('mouseout', hideTooltip)
		.on('focus', showTooltip(mountTooltip))
		.on('blur', hideTooltip)

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

const zoomCtl = (g, mapBounds) => {
	const zoom = d3.zoom()
		.on('zoom', () => { g.attr('transform', d3.event.transform) })
		.scaleExtent([1, 6])
		.translateExtent(mapBounds)
	svg.call(zoom)
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

const renderMap = (data, imported, mountTextTooltip) => {
	const width = svg.attr('viewBox').split(' ')[2]
	const height = svg.attr('viewBox').split(' ')[3]
	const projection = d3.geoMercator()
		.fitSize([width, height], { type: 'FeatureCollection', features: data })
	const path = d3.geoPath(projection)

	mountPaths(data, path, mountTextTooltip)
	mountTexts(data, projection)
	zoomCtl(g, path.bounds({ type: 'FeatureCollection', features: data }))
	paintScale(xValues(data), height)
	if (imported.properties.confirmed) {
		mountTable([...data, imported])
		mountTotals([...data, imported])
		return
	}
	mountTable(data)
	mountTotals(data)
}

const renderGraph = (data) => {
	const graph = d3.select('#graph')
	const width = graph.attr('viewBox').split(' ')[2]
	const height = graph.attr('viewBox').split(' ')[3]
	const margin = { top: 200, left: 10, bottom: 20, right: 35 }
	const innerWidth = width - margin.left - margin.right
	const innerHeight = height - margin.top - margin.bottom
	const latestDays = 30

	const cValues = (d) => d.confirmed
	const dValues = (d) => d.deaths
	const yValues = (d) => new Date(d.date)

	const lastTotals = {
		date: (new Date()).valueOf(),
		confirmed: 0,
		deaths: 0,
	}
	data.filter ((d) => d.is_last === 'True')
		.forEach((d) => {
			lastTotals.confirmed += +d.confirmed
			lastTotals.deaths += +d.deaths
		})

	const consolidate = data.reduce((accum, d) => {
		const [year, month, day] = d.date.split('-')
		const filterByDate = (i) => i.date === (new Date(year, month - 1, day)).valueOf()
		if (accum.filter(filterByDate).length > 0) {
			accum.filter(filterByDate)[0].confirmed += +d.confirmed
			accum.filter(filterByDate)[0].deaths += +d.deaths
			return accum
		}
		accum.push({
			date: (new Date(year, month - 1, day)).valueOf(),
			confirmed: +d.confirmed,
			deaths: +d.deaths,
		})
		return accum
	}, []).sort((a, b) => b.date - a.date)

	const lastMonthData = consolidate.slice(1, latestDays).reverse()
	lastMonthData.push(lastTotals)

	const cMax = d3.max(lastMonthData.map(cValues))
	const scaleL = d3.scaleLinear()
		.domain([cMax, 0])
		.range([0, innerHeight])
	const scaleB = d3.scaleBand()
		.domain(lastMonthData.map(yValues))
		.range([0, innerWidth])
		.padding(0.1)
	const scaleColor = d3.scaleLinear()
		.domain([0, cMax])
		.range(['#ffeecc', 'darkred'])

	graph.select('g.yAxis')
		.attr('transform', `translate(${margin.left + innerWidth}, ${margin.top})`)
		.call(d3.axisRight(scaleL))
		.selectAll('line')
		.attr('x1', -innerWidth)
	graph.select('g.xAxis')
		.attr('transform', `translate(${margin.left}, ${margin.top + innerHeight})`)
		.call(d3.axisBottom(scaleB).tickFormat((d) => d.getDate()))
		.selectAll('text')
		.append('title')
		.text((d) => d.toLocaleDateString())

	const gBars = graph.select('g.bars')
		.attr('transform', `translate(${margin.left}, ${margin.top})`)
		.selectAll('g')
		.data(lastMonthData)
		.enter()
		.append('g')

	const tt = (d, i, nodes) => {
		const previous = d3.select(nodes[i - 1]).datum().confirmed
		return `<strong>Data</strong>: ${yValues(d).toLocaleDateString()}<br>
			<strong>Confirmados</strong>: ${cValues(d)}<br>
			<strong>Casos novos</strong>: ${previous !== 0 ? cValues(d) - previous : 'Dados ausentes para o dia anterior'}<br>
			<strong>Mortos</strong>: ${dValues(d)}`
	}

	gBars.attr('tabindex', 0)
		.on('mouseover', showTooltip(tt))
		.on('mouseout', hideTooltip)
		.on('focus', showTooltip(tt))
		.on('blur', hideTooltip)

	gBars.append('rect')
		.style('fill', (d) => scaleColor(cValues(d)))
		.classed('confirmed', true)
		.attr('x', (_, i) => i * scaleB.step())
		.attr('width', scaleB.bandwidth())
		.attr('height', 0)
		.attr('y', innerHeight)
		.transition().duration(3000).delay(100)
		.attr('y', (d) => scaleL(cValues(d)))
		.attr('height', (d) => innerHeight - scaleL(cValues(d)))
	gBars.append('rect')
		.style('fill', 'black')
		.classed('deaths', true)
		.attr('x', (_, i) => i * scaleB.step())
		.attr('width', scaleB.bandwidth() / 2)
		.attr('height', 0)
		.attr('y', innerHeight)
		.transition().duration(3000).delay(100)
		.attr('y', (d) => scaleL(dValues(d)))
		.attr('height', (d) => innerHeight - scaleL(dValues(d)))

	graph.append('text')
		.attr('x', width / 2)
		.attr('y', margin.top)
		.style('text-anchor', 'middle')
		.style('font-size', '1.75em')
		.text(`Últimos ${latestDays} dias`)
}
