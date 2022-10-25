import {
	axisBottom,
	axisRight,
	format,
	geoCentroid,
	geoMercator,
	geoPath,
	max,
	min,
	scaleBand,
	scaleLinear,
	select,
	zoom,
} from 'd3'

const svg = select('#map')
const g = svg.append('g')
const gPolygons = g.append('g')
const gTexts = g.append('g')
const gScale = svg.append('g')
const options = { sortField: 'confirmed', sortDesc: true }
const tooltip = select('.col').insert('div').classed('tooltip', true).style('opacity', 0)

const codarea = (d) => d.properties.codarea
const xValues = (data) => data.map(confirmed)
export const nome = (d) => d.properties.nome || d.properties.state
export const confirmed = (d) => d.properties.confirmed || 0
export const confirmedF = (d) => formatN(d.properties.confirmed || 0)
export const deaths = (d) => d.properties.deaths || 0
export const deathsF = (d) => formatN(d.properties.deaths || 0)
export const lastUpdate = (d) => d.properties.lastUpdate
export const populacaoF = (d) => formatN(d.properties.populacao || 0)
export const formatN = (str) => format(',')(str).replace(/,/g, '.')

const hideTooltip = () => tooltip.transition().duration(1000).style('opacity', 0)

const showTooltip = (mountTextTooltip) => (ev, d) => {
	tooltip.transition().style('opacity', 0.9)
		.style('left', () => {
			if (ev.type === 'mouseover') return ev.pageX + 'px'
			if (ev.target.nodeName === 'path') {
				const { x, width } = ev.target.getBBox()
				return `${x + width}px`
			}
			return '50%'
		})
		.style('top', () => {
			if (ev.type === 'mouseover') return ev.pageY + 'px'
			if (ev.target.nodeName === 'path') {
				const { y, height } = ev.target.getBBox()
				return `${y + height}px`
			}
			return '50%'
		})
	tooltip.html(mountTextTooltip(ev, d))
}

const paintScale = (xValues, height) => {
	const extent = [max(xValues), 0]
	const color = (d) => scaleLinear().domain(extent).range(['darkred', '#ffeecc'])(d)
	const scale = scaleLinear().domain(extent).range([0, 48])
	const axis = axisRight(scale).ticks(6, ',.2r')

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

	const trsEnter = select('#tbl').select('tbody').selectAll('tr')
		.data(localData, codarea).enter().append('tr')

	trsEnter.append('td').classed('local', true).text(nome)
	trsEnter.append('td').classed('confirmed', true).text(confirmedF)
	trsEnter.append('td').classed('deaths', true).text(deathsF)
	trsEnter.append('td').classed('lastUpdate', true).text(lastUpdate)
	trsEnter.append('td').text(populacaoF)

	const trs = select('#tbl').select('tbody').selectAll('tr')
	trs.selectAll('td.local').text(nome)
	trs.selectAll('td.confirmed').text(confirmedF)
	trs.selectAll('td.lastUpdate').text(lastUpdate)
	trs.selectAll('td.deaths').text(deathsF)
}

const mountPaths = (data, path, mountTooltip) => {
	const color = scaleLinear().domain([0, max(xValues(data))]).range(['#ffeecc', 'darkred'])
	gPolygons.selectAll('path').data(data, codarea).enter()
		.append('path')
		.attr('d', path)
		.attr('tabindex', 0)
		.style('fill', (d) => confirmed(d) === 0 ? null : color(confirmed(d)))
		.on('mouseover',showTooltip(mountTooltip))
		.on('mouseout', hideTooltip)
		.on('focus', showTooltip(mountTooltip))
		.on('blur', hideTooltip)

	gPolygons.selectAll('path')
		.transition().duration(1000)
		.style('fill', (d) => confirmed(d) === 0 ? null : color(confirmed(d)))

		gPolygons.selectAll('path').on('click', (ev, d) => {
			if (d.properties.state) {
				window.location = `/estados.html?UF=${d.properties.state}`
				return
			}
			showTooltip(mountTooltip)(ev, d)
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
		const n = parseInt(nodes[i].textContent.replace('.', ''), 10) || 0
		return d.properties[field] !== n ? tempValue : defaultValue
	}
	const centerX = (d) => projection(geoCentroid(d))[0]
	const centerY = (d) => projection(geoCentroid(d))[1]

	const zoomFactor = g.attr('transform') ? parseFloat(g.attr('transform').split(' ')[1].substr(6)) : 1
	gTexts.selectAll('text')
		.data(data, codarea).enter()
		.append('text')
		.attr('x', centerX)
		.attr('y', centerY)
		.attr('dy', '0.33em')
		.style('font-size', `${.5 / zoomFactor}em`)
		.text((d) => confirmed(d) > 0 ? formatN(confirmed(d)) : '')

	gTexts.selectAll('text')
		.transition().duration(1000)
		.style('fill', IsChangedField('confirmed', 'black', 'red'))
		.style('font-size', IsChangedField('confirmed', `${.5 / zoomFactor}em`, `${1.5 / zoomFactor}em`))
		.transition().duration(1500)
		.style('fill', 'black')
		.style('font-size', `${.5 / zoomFactor}em`)

	gTexts.selectAll('text')
		.text((d) => confirmed(d) > 0 ? formatN(confirmed(d)) : '')
}

const zoomCtl = (g, mapBounds) => {
	const zoomFunc = zoom()
		.on('zoom', (ev) => {
			g.attr('transform', ev.transform)
			gTexts.selectAll('text')
				.style('font-size', `${0.5/ev.transform.k}em`)
		})
		.scaleExtent([1, 6])
		.translateExtent(mapBounds)
	svg.call(zoomFunc)
}

const mountTotals = (data) => {
	select('#totals').select('.confirmed').text(() => {
		const confirmedTotal = data.map(confirmed).reduce((accum, i) => accum + i, 0)
		return `Total de confirmações: ${formatN(confirmedTotal)}`
	})
	select('#totals').select('.deaths').text(() => {
		const deathsTotal = data.map(deaths).reduce((accum, i) => accum + i, 0)
		return `Total de mortes: ${formatN(deathsTotal)}`
	})
}

export const renderMap = (data, imported, mountTextTooltip) => {
	const width = svg.attr('viewBox').split(' ')[2]
	const height = svg.attr('viewBox').split(' ')[3]
	const projection = geoMercator()
		.fitSize([width, height], { type: 'FeatureCollection', features: data })
	const path = geoPath(projection)

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

export const renderGraph = (data) => {
	const graph = select('#graph')
	const width = graph.attr('viewBox').split(' ')[2]
	const height = graph.attr('viewBox').split(' ')[3]
	const margin = { top: 200, left: 10, bottom: 20, right: 50 }
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

	const cMax = max(lastMonthData.map(cValues))
	const cMin = min(lastMonthData.map(cValues))
	const scaleL = scaleLinear()
		.domain([cMax, cMin])
		.range([0, innerHeight])
	const scaleB = scaleBand()
		.domain(lastMonthData.map(yValues))
		.range([0, innerWidth])
		.padding(0.1)
	const scaleColor = scaleLinear()
		.domain([cMin, cMax])
		.range(['#ffeecc', 'darkred'])

	graph.select('g.yAxis')
		.attr('transform', `translate(${margin.left + innerWidth}, ${margin.top})`)
		.call(axisRight(scaleL))
		.selectAll('line')
		.attr('x1', -innerWidth)
	graph.select('g.xAxis')
		.attr('transform', `translate(${margin.left}, ${margin.top + innerHeight})`)
		.call(axisBottom(scaleB).tickFormat((d) => d.getDate()))
		.selectAll('text')
		.append('title')
		.text((d) => d.toLocaleDateString())

	const gBars = graph.select('g.bars')
		.attr('transform', `translate(${margin.left}, ${margin.top})`)
		.selectAll('g')
		.data(lastMonthData)
		.enter()
		.append('g')

	const tt = (ev, d) => {
		const previousEl = select(ev.target.parentNode.previousSibling)
		const previous = previousEl.data().length === 1 ? previousEl.datum().confirmed : 0
		return `<strong>Data</strong>: ${yValues(d).toLocaleDateString()}<br>
			<strong>Confirmados</strong>: ${formatN(cValues(d))}<br>
			<strong>Casos novos</strong>: ${previous !== 0 ? formatN(cValues(d) - previous) : 'Dados ausentes para o dia anterior'}<br>
			<strong>Mortos</strong>: ${formatN(dValues(d))}`
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

	graph.select('text.title')
		.attr('x', width / 2)
		.attr('y', margin.top)
		.text(`Últimos ${latestDays} dias`)
}
