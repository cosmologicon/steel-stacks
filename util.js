
let tau = 2 * Math.PI
let div = (x, n) => ((x % n) + n) % n
let clamp = (x, a, b) => x < a ? a : x > b ? b : x
let approach = (x, target, dx) => x < target ? Math.min(x + dx, target) : Math.max(x - dx, target)
let slicestep = (arr, start, stop, step) => {
	let ret = []
	for (let j = start ; j < stop ; j += step) {
		ret.push(arr[j])
	}
	return ret
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





