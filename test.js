var {calc, load, when} = require('./index')()


calc('total', {
	wants: ['items'],
	solve: ({items}) => items.reduce((acc, cur) => acc + cur, 0)
})

calc('average', {
	wants: ['total', 'items'],
	solve: ({total, items}) => total / items.length
})



when('total', total => { console.log('Total is', total) })

when('average', average => { console.log('Average is', average) })


console.log(load({items: [10, 30]})) //{ items: [ 10, 30 ], total: 40, average: 20 }

console.log(load({items: [10, 5, 5, 10, 10]})) //{ items: [ 10, 5, 5, 10, 10 ], total: 40, average: 8 }



