var kalkyl = (function() {

	var clone = function(value) {
		return JSON.parse(JSON.stringify(value))
	}

	var match = function(prev, next, voids) {

		if(next && prev && next.constructor == Object && prev.constructor == Object) {
			var result

			if(voids) {
				for(var key in prev) {
					if(next[key] === undefined) {
						if(!result) { result = {} }
						result[key] = undefined
					}
				}
			}

			for(var key in next) {
				var val = match(prev[key], next[key])
				if(val !== undefined) {
					if(!result) { result = {} }
					result[key] = val
				}
			}

			return result
		}
		else if(prev != next) {
			return next
		}
	}

	var merge = function(data, into) {

		if(!data || data.constructor != Object) { return into }
		if(!into) { into = {} }

		for(var key in data) {
			var value = data[key]
			if(value && value.constructor == Object) {
				into[key] = merge(value, into[key])
			}
			else {
				into[key] = value
			}
		}
		
		return into
	}

	var defined = function(properties, inside) {
		for(var i = 0; i<properties.length; i++) {
			if(inside[properties[i]] === undefined) {
				return false
			}
		}
		return true
	}

	var place = (into, path, value) => {
		var comps = path.split('.')
		var field = comps.pop()
		while(comps.length > 0) {
			var cur = comps.shift()
			into = into[cur] || (into[cur] = {})
		}
		into[field] = value
	}

	var expand = function(object) {
		var result = {}
		for(var name in object) {
			place(result, name, object[name])
		}
		return result
	}

	return function() {

		var calcs = {}
		var views = []

		var prepare = function(args, value, result) {
			value = expand(value)
			for(var name in value) {
				var calc = calcs[name]
				if(calc) {
					if(value[name] != null && calc.remap) {
						result = prepare(args, calc.remap(value[name]), result)
					}
					else {
						args[name] = value[name]
						result = true
					}
				}
			}
			return result == true
		}

		var resolve = function(context, queue, result) {

			if(queue.length == 0) {
				return result == true
			}

			var name = queue.shift()
			var calc = calcs[name]
			var flag = context.flag

			if(!calc || !calc.solve) {
				flag[name] = false
			}

			if(flag[name] != undefined) {
				return resolve(context, queue, flag[name] || result)
			}

			var args = context.args[name]
			var data = context.data
			var wants = calc.wants

			flag[name] = false

			var invalid = (wants && resolve(context, wants.slice())) || args !== undefined || data[name] === undefined

			if(invalid && (!wants || defined(wants, data))) {

				var prev = data[name]
				var next = calc.solve(data, args, prev)
				var diff = match(prev, next, true)

				if(diff !== undefined) {
					context.diff[name] = diff
					data[name] = next
					flag[name] = true
				}

			}

			return resolve(context, queue, flag[name] || result)
		}

		var state = {
			
			data: {},
			
			calc: function(name, item) {
				calcs[name] = item
			},

			load: function(value) {

				var args = {}

				if(value && !prepare(args, value)) {
					return state.data
				}

				var context = {data:clone(state.data || {}), diff:{}, args:args, flag:{}}
				var queue = Object.keys(args)
				
				if(queue.length > 0 && !resolve(context, queue)) {
					return state.data
				}

				resolve(context, Object.keys(calcs))

				if(Object.keys(context.diff) == 0) {
					return state.data
				}

				var data = clone(context.data)
				
				for(var key in context.diff) {
					state.data[key] = data[key]
				}

				state.emit(context.diff)

				return data
			},

			emit: function(value) {
				var result
				for(var i = 0; i<views.length; i++) {
					result = merge(views[i](value), result)
				}
				if(result) {
					state.load(result)
				}
			},

			when: function(filter, translate) {
				if(!filter) {
					views.push(translate)
					return
				}
				var comps = filter.split('.')
				views.push(function(change) {
					var index = 0
					while(change !== undefined && index < comps.length) {
						change = change[comps[index++]]
					}
					if(change !== undefined) {
						return translate(change)
					}
				})
			}

		}

		return state
	}

})()

if(typeof module !== 'undefined') {
  module.exports = kalkyl
}