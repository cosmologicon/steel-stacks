
UFX.scenes.end = {
	start: function () {
		this.t = 0
		this.bg = new Animation(slice_sprite_sheet("end_screen", 384, 288), 0.15, true)
	},
	think: function (dt) {
		this.t += dt
		this.bg.update(dt)
	},
	draw: function () {
		UFX.draw("fs #611 f0 drawimage", this.bg.current_frame)
	},
}


