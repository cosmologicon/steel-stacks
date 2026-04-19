"use strict"

let tau = 2 * Math.PI
let div = (x, n) => ((x % n) + n) % n
let clamp = (x, a, b) => x < a ? a : x > b ? b : x
let approach = (x, target, dx) => x < target ? Math.min(x + dx, target) : Math.max(x - dx, target)
let range = (start, stop, step) => {
	step = step || 1
	let js = []
	if (step > 0) {
		for (let j = start ; j < stop ; j += step) js.push(j)
	} else {
		for (let j = start ; j > stop ; j += step) js.push(j)
	}
	return js
}
let slicestep = (arr, start, stop, step) => range(start, stop, step).map(j => arr[j])

function tile_to_xy(tilepos) {
	let [tile_x, tile_y] = tilepos
	return [tile_x * 24, tile_y * 24]
}
function xy_to_tile(xy) {
	let [x, y] = xy
	return [Math.floor(x / 24), Math.floor(y / 24)]
}


function slice_sprite_sheet(imgname, w, h) {
	let img = UFX.resource.images[imgname]
	let nx = Math.round(img.width / w)
	let ny = Math.round(img.height / h)
	console.assert(nx * w == img.width && ny * h == img.height)
	let frames = []
	for (let jy = 0 ; jy < ny ; ++jy) {
		for (let jx = 0 ; jx < nx ; ++jx) {
			let frame = document.createElement("canvas")
			frame.width = w
			frame.height = h
			UFX.draw(frame.getContext("2d"), "drawimage", img, -w * jx, -h * jy)
			frames.push(frame)
		}
	}
	return frames
}

function copy_image(img) {
	let copy = document.createElement("canvas")
	copy.width = img.width
	copy.height = img.height
	UFX.draw(copy.getContext("2d"), "c0 drawImage0", img)
	return copy
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
		this.jframe = this.loop ? div(jframe0, nframe) : clamp(jframe0, 0, nframe - 1)
		this.current_frame = this.frames[this.jframe]
	},
	update: function (dt) {
		this.t += dt
		this.set_frame()
	},
}





