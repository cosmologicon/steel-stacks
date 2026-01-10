
UFX.scenes.end = {
	start: function () {
		this.t = 0
	},
	think: function (dt) {
		this.t += dt
	},
	draw: function () {
		let jframe = Math.floor(this.t / 0.15) % 7
		UFX.draw("fs #611 f0 drawimage", UFX.resource.images.end_screen, -jframe * 384, 0)
	},
}


