"use strict"

let mod = (x, n) => ((x % n) + n) % n
let clamp = (x, a, b) => x < a ? a : x > b ? b : x
let approach = (x, target, dx) => x < target ? Math.min(x + dx, target) : Math.max(x - dx, target)
let range = (start, stop, step) => {
	step ||= 1
	let js = []
	if (step > 0) {
		for (let j = start ; j < stop ; j += step) js.push(j)
	} else {
		for (let j = start ; j > stop ; j += step) js.push(j)
	}
	return js
}
let slicestep = (arr, start, stop, step) => range(start, stop, step).map(j => arr[j])
// Cartesian product of two Arrays
let product = (xs, ys) => xs.map(x => ys.map(y => [x, y])).flat()
let vec_add = ([x0, y0], [x1, y1]) => [x0 + x1, y0 + y1]
let round_pos = ([x, y]) => [Math.round(x), Math.round(y)]

// Intervals are [x, w] Arrays representing the half-open interval [x, x+w).
let interval_collide = ([x0, w0], [x1, w1]) => x0 + w0 > x1 && x1 + w1 > x0
// How far the first interval must move to the left and right to not overlap the second obj.
// Both values are positive if the intervals collide.
let interval_overlaps = ([x0, w0], [x1, w1]) => [x0 + w0 - x1, x1 + w1 - x0]
let get_abs_overlap = ([x0, w0], [x1, w1]) => Math.max(Math.min(x0 + w0 - x1, x1 + w1 - x0), 0)

// Rects include all points whose x-coordinate is within the interval [x, w] and
// y-coordinate is within the interval [y, h].
let rect_collide = ([x0, y0, w0, h0], [x1, y1, w1, h1]) =>
	interval_collide([x0, w0], [x1, w1]) && interval_collide([y0, h0], [y1, h1])
let rect_centered_at = ([x, y], [w, h]) => [x - w/2, y - h/2, w, h]

let GscaleT = 24  // Game units per tile.
let tile_size = [GscaleT, GscaleT]
// T: tile coordinates (integers). A point is within the tile.
let GconvertT = ([xT, yT]) => [GscaleT * xT, GscaleT * yT]
let TconvertG = ([xG, yG]) => [Math.floor(xG / GscaleT), Math.floor(yG / GscaleT)]

// Tiles covered by the interval/rect.
let TintervalG = ([xG, wG]) => range(Math.floor(xG / GscaleT), (xG + wG) / GscaleT)
let TrectG = ([x, y, w, h]) => product(TintervalG([x, w]), TintervalG([y, h]))
console.assert("" + TintervalG([10, 14]) == [0])
console.assert("" + TintervalG([10, 15]) == [0, 1])


// Returns a canvas of the given size with a `context` member.
function make_canvas([w, h], draw_command) {
	let canvas = document.createElement("canvas")
	canvas.width = w
	canvas.height = h
	canvas.context = canvas.getContext("2d")
	if (draw_command) UFX.draw(canvas.context, draw_command)
	return canvas
}


function slice_sprite_sheet(imgname, w, h) {
	let img = UFX.resource.images[imgname]
	let nx = Math.round(img.width / w)
	let ny = Math.round(img.height / h)
	console.assert(nx * w == img.width && ny * h == img.height)
	let frames = []
	for (let jy = 0 ; jy < ny ; ++jy) {
		for (let jx = 0 ; jx < nx ; ++jx) {
			frames.push(make_canvas([w, h], ["drawimage", img, -w * jx, -h * jy]))
		}
	}
	return frames
}

function copy_image(img) {
	return make_canvas([img.width, img.height], ["c0 drawimage0", img])
}

function glow_image(img) {
	let glow = copy_image(img)
	let context = glow.getContext("2d")
	context.save()
	context.globalCompositeOperation = "source-in"
	UFX.draw(context, "fs white f0 ]")
	return glow
}

function lighten_image(img) {
	let glow = glow_image(img)
	let context = glow.getContext("2d")
	context.save()
	context.globalCompositeOperation = "lighter"
	UFX.draw(context, "fs white alpha 0.5 f0 ]")
	return glow
}

// 0 <= alpha <= 1
function glow_image_alpha(img, alpha) {
	let copy = copy_image(img)
	let glow = glow_image(img)
	UFX.draw(copy.getContext("2d"), "[ alpha", alpha, "drawimage0", glow, "]")
	return copy
}




function Animation(frames, interval, loop) {
	this.frames = frames
	this.interval = interval
	this.loop = loop
	this.reset()
}
Animation.prototype = {
	reset: function () {
		this.t = 0
		this.set_frame()
	},
	set_frame: function () {
		let jframe0 = Math.floor(this.t / this.interval)
		let nframe = this.frames.length
		this.jframe = this.loop ? mod(jframe0, nframe) : clamp(jframe0, 0, nframe - 1)
		this.current_frame = this.frames[this.jframe]
	},
	update: function (dt) {
		this.t += dt
		this.set_frame()
	},
}





