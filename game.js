"use strict"

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


function Character(pos) {
	this.pos = pos
	this.vel = [0, 0]
	this.grounded = false
	this.move_x = 0
	this.jump_down = false
	this.jump_held = false
	this.facing_right = true

	this.max_move_speed = 100
	this.move_accel = 1000
	this.move_decel = 600
	this.jump_speed = 160
	this.gravity = 1100
	this.max_fall_speed = 200
	this.var_jump_time = 0.2
	this.coyote_time = 0.05

	// Changed from 160 in the pygame version. The maximum jump height with jump_speed
	// set to 160 is 23.78 (same in both versions). Somehow this is enough to get on top
	// of a block with height 24 in pygame. Maybe pygame.Rect coordinate truncation?
	this.jump_speed = 164

	let char_frames = slice_sprite_sheet("character_ss", 24, 24)
	this.images = {
		stand_right: char_frames[0],
		walk_right: new Animation(char_frames.slice(1, 5), 0.15, true),
		stand_left: char_frames[5],
		walk_left: new Animation(char_frames.slice(6, 10), 0.15, true),
		jump_right: char_frames[10],
		jump_left: char_frames[11],
	}
}
Character.prototype = {
	set_pos: function (pos) {
		this.pos = pos
		this.rect = rect_centered_at(pos, [14, 24])
		let [x, y, w, h] = this.rect
		this.xinterval = [x, w]
		this.yinterval = [y, h]
	},
	scoot: function (dpos) {
		this.set_pos(vec_add(this.pos, dpos))
	},
	control: function (move_x, jump_down, jump_held) {
		this.move_x = move_x
		this.jump_held = jump_held
		this.jump_down = jump_down
	},
	jump: function () {
		let [vx, vy] = this.vel
		this.vel = [vx, -this.jump_speed]
		this.var_jump_timer = this.var_jump_time
		this.grounded = false
	},
	update: function (dt) {
		this.update_movement(dt)
		if (this.jump_down && this.coyote_timer > 0) this.jump()
		this.update_position(dt)

		if (this.move_x > 0) this.facing_right = true
		if (this.move_x < 0) this.facing_right = false
		
		let dir = this.facing_right ? "right" : "left"
		if (!this.grounded) {
			this.image = this.images[`jump_${dir}`]
		} else {
			if (this.move_x == 0) {
				this.image = this.images[`stand_${dir}`]
			} else {
				let anim = this.images[`walk_${dir}`]
				anim.update(dt)
				this.image = anim.current_frame
			}
		}
		this.var_jump_timer = approach(this.var_jump_timer, 0, dt)
	},
	update_movement: function (dt) {
		let [vx, vy] = this.vel
		let accel = this.move_x ? this.move_accel : this.move_decel
		vx = approach(vx, this.move_x * this.max_move_speed, accel * dt)
		this.coyote_timer = this.grounded ? this.coyote_time : approach(this.coyote_timer, 0, dt)
		if (!this.grounded) {
			if (this.var_jump_timer > 0) {
				if (this.jump_held && vy < 0) {
					vy += this.gravity * 0.5 * dt
				} else {
					this.var_jump_timer = 0
					if (vy < 0) vy *= 0.5  // TODO: indepedent of dt
				}
			} else {
				vy += this.gravity * dt
			}
		}
		this.vel = [vx, vy]
//		console.log(this.grounded, this.var_jump_timer, this.vel, 228 - this.pos[1])
	},
	update_position: function (dt) {
		let [vx, vy] = this.vel
		this.scoot([vx * dt, 0])
		for (let obj of world.get_colliders(this.rect)) this.collide_horizontal(obj)
		this.scoot([0, vy * dt])
		for (let obj of world.get_colliders(this.rect)) this.collide_vertical(obj)
		;[vx, vy] = this.vel
		if (vy > 0) {
			this.grounded = false
		} else if (this.grounded && vy == 0) {
			this.grounded = world.is_on_ground(this.rect)
		}
	},
	collide_horizontal: function (obj) {
		let [vx, vy] = this.vel
		let [overlap_left, overlap_right] = interval_overlaps(this.xinterval, obj.xinterval)
		// This can happen with two colliders in the same frame. TODO: Avoid?
		if (overlap_left <= 0 || overlap_right <= 0) return
		let dx =
			vx > 0 ? -overlap_left :
			vx < 0 ? overlap_right :
			// When vx == 0, push in direction of least displacement.
			overlap_left < overlap_right ? -overlap_left : overlap_right
		this.scoot([dx, 0])
		this.vel = [0, vy]
	},
	collide_vertical: function (obj) {
		let [vx, vy] = this.vel
		let [overlap_top, overlap_bottom] = interval_overlaps(this.yinterval, obj.yinterval)
		// This can happen with two colliders in the same frame. TODO: Avoid?
		if (overlap_top <= 0 || overlap_bottom <= 0) return
		if (vy > 0) {
			this.scoot([0, -overlap_top])
			this.grounded = true
		} else {
			this.scoot([0, overlap_bottom])
			this.var_jump_timer = 0
		}
		this.vel = [vx, 0]
	},
	draw: function () {
		let [x, y, w, h] = this.rect
		let [x0, y0] = this.pos
		return ["drawimage", this.image, x0 - 12, y0 - 12] // , "[ alpha 0.3 fs yellow fr", this.rect, "]"]
	},
}


