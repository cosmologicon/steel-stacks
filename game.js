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

// Provides: image
// Requires: move_x, picking_up, grounded
let CharacterImage = {
	setup: function () {
		this.facing_right = true
		let char_frames = slice_sprite_sheet("character_ss", 24, 24)
		this.images = {
			stand_right: char_frames[0],
			walk_right: new Animation(char_frames.slice(1, 5), 0.15, true),
			stand_left: char_frames[5],
			walk_left: new Animation(char_frames.slice(6, 10), 0.15, true),
			jump_right: char_frames[10],
			jump_left: char_frames[11],
			pickup: char_frames[15],
		}
	},
	update: function (dt) {
		if (this.move_x > 0) this.facing_right = true
		if (this.move_x < 0) this.facing_right = false
		this.image = this.get_image(dt)
	},
	get_image: function (dt) {
		if (this.picking_up) return this.images.pickup
		let dir = this.facing_right ? "right" : "left"
		if (!this.grounded) return this.images[`jump_${dir}`]
		if (this.move_x == 0) return this.images[`stand_${dir}`]
		let anim = this.images[`walk_${dir}`]
		anim.update(dt)
		return anim.current_frame
	},
}

// Provides: center_and_then
let Centering = {
	setup: function () {
		this.is_centering = false
		this.centering_targetx = null
		this.centering_callback = null
	},
	center_and_then: function (target, callback) {
		this.is_centering = true
		this.centering_target = target
		this.centering_callback = callback
	},
	finish_centering: function () {
		this.is_centering = false
		this.centering_finish_timer = 0.15
		this.centering_locked_position = this.get_pos()
		this.centering_target = null
	},
	update_centering: function (dt) {
		if (!this.centering_target) {
			console.log("!this.centering_target")
			this.finish_centering()
			return
		}
		let centering_speed = 150
		if (this.approach_anchor_bottom(this.centering_target, centering_speed * dt)) {
			this.finish_centering()
		}
	},
	update: function (dt) {
		if (this.centering_finish_timer > 0) {
			this.centering_finish_timer = approach(this.centering_finish_timer, 0, dt)
			if (this.centering_finish_timer == 0) {
				if (this.centering_callback) {
					this.centering_callback()
					this.centering_callback = null
				}
				this.centering_locked_position = null
			}
		}
		if (this.is_centering) {
			this.update_centering(dt)
		} else if (this.centering_locked_position) {
			this.set_pos(this.centering_locked_position)
		}
	},
	can_move: function () {
		return !this.is_centering && !this.centering_locked_position
	},
	can_pickup: function () {
		return !this.is_centering
	},
}


// Provides: attempt_pickup, picking_up
let PicksUp = {
	setup: function () {
		this.picking_up = false
		this.max_held_blocks = 3
		// Half-widths (u is half of w, get it?)
		this.upickup = 9  // for picking up
	},
	can_pickup: function () {
		return this.num_held() < this.max_held_blocks
	},
	attempt_pickup: function () {
		if (!this.can_pickup()) return
		let target_block = this.find_pickup_target_block()
		if (!target_block) return
		this.picking_up = true
		this.center_and_then(target_block.get_anchor_top(), this.complete_pickup.bind(this, target_block))
	},
	find_pickup_target_block: function () {
		if (!this.grounded) return null
		// TODO: check num blocks held < 3
		return world.pickup_target(this.get_anchor_bottom(), this.upickup)
	},
	complete_pickup: function (block) {
		this.picking_up = false
		this.set_center(block.get_center())
		world.remove_ore(block)
		this.add_held(new HeldBlock(block))
	},

}

// Provides: move_x
let MoveHorizontal = {
	setup: function () {
		this.vx = 0
		this.move_x = 0
		this.max_move_speed = 100
		this.move_accel = 1000
		this.move_decel = 600
	},
	update_movement: function (dt) {
		let accel = this.move_x ? this.move_accel : this.move_decel
		this.vx = approach(this.vx, this.move_x * this.max_move_speed, accel * dt)
	},
	update_position: function (dt) {
		this.scoot([this.vx * dt, 0])
		this.handle_horizontal_collision()
		if (this.held) {
			this.held.handle_horizontal_collisions()
			this.held.check_fall(this)
		}
	},
	handle_horizontal_collision: function () {
		// The max jump height is 23.78 but you want to be able to jump up to a block 24 high.
		// In pygame this works somehow, I suspect via pygame.Rect coordinate truncation.
		// Here we do it by excluding 1 pixel from the bottom of the character's rect for the
		// purpose of horizontal collision only.
		let [x, y, w, h] = this.rect, hrect = [x, y, w, h - 1]
		let objs = world.get_colliders(hrect)
		if (!objs.length) return
		let xinterval = interval_cover_set(objs.map(obj => obj.xinterval))
		// How far I need to move in the x and y 
		let overlap_left = overlap(this.xinterval, xinterval)
		let overlap_right = overlap(xinterval, this.xinterval)
		console.assert(overlap_left > 0 && overlap_right > 0)
		let dx =
			this.vx > 0 ? -overlap_left :
			this.vx < 0 ? overlap_right :
			// When vx == 0, push in direction of least displacement.
			overlap_left < overlap_right ? -overlap_left : overlap_right
		this.scoot([dx, 0])
		this.vx = 0
	},
}

// Provides: grounded
let MoveVertical = {
	setup: function () {
		this.vy = 0
		this.grounded = false
		this.jump_speed = 160
		this.gravity = 1100
		this.max_fall_speed = 200
		this.var_jump_time = 0.2
		this.var_jump_timer = 0
		this.coyote_time = 0.05
	},
	jump: function () {
		this.vy = -this.jump_speed
		this.var_jump_timer = this.var_jump_time
		this.grounded = false
	},
	update: function (dt) {
		this.var_jump_timer = approach(this.var_jump_timer, 0, dt)
	},
	update_movement: function (dt) {
		this.coyote_timer = this.grounded ? this.coyote_time : approach(this.coyote_timer, 0, dt)
		if (!this.grounded) {
			if (this.var_jump_timer > 0) {
				if (this.jump_held && this.vy < 0) {
					this.vy += this.gravity * 0.5 * dt
				} else {
					this.var_jump_timer = 0
					if (this.vy < 0) this.vy *= 0.5  // TODO: make independent of dt
				}
			} else {
				this.vy += this.gravity * dt
			}
		}
		if (this.jump_down && this.coyote_timer > 0) this.jump()
	},
	update_position: function (dt) {
		this.scoot([0, this.vy * dt])
		this.handle_downward_collision()
		this.handle_upward_collision()
		this.set_grounded()
	},
	handle_downward_collision: function () {
		let objs = world.get_colliders(this.rect)
		if (!objs.length) return
		let yinterval = interval_cover_set(objs.map(obj => obj.yinterval))
		let overlap_up = overlap(this.yinterval, yinterval)
		let overlap_down = overlap(yinterval, this.yinterval)
		if (overlap_up == 0 || overlap_down == 0) return
		if (overlap_up < overlap_down) {
			this.scoot([0, -overlap_up])
			this.grounded = true
		}
		this.vy = 0
	},
	handle_upward_collision: function () {
		if (this.vy > 0) return
		let overlap_down = this.get_upward_overlap()
		if (overlap_down == 0) return
		this.scoot([0, overlap_down])
		this.var_jump_timer = 0
		this.vy = 0
	},
	set_grounded: function () {
		if (this.vy > 0) {
			this.grounded = false
		} else if (this.grounded && this.vy == 0) {
			this.grounded = world.is_on_ground(this.rect)
		}
	},
}



function Character(pos) {
	this.set_pos_size(pos, [14, 24])
	this.jump_down = false
	this.jump_held = false
	this.setup()
}
Character.prototype = UFX.Thing()
	.addcomp(CollisionRect)
	.addcomp(DrawImageCentered)
	.addcomp(Centering)
	.addcomp(PicksUp)
	.addcomp(CanHold)
	.addcomp(MoveHorizontal)
	.addcomp(MoveVertical)
	.addcomp({
		control: function (key) {
			this.move_x = (key.pressed.right ? 1 : 0) - (key.pressed.left ? 1 : 0)
			this.jump_held = key.pressed.jump
			this.jump_down = key.down.jump
			if (key.down.down) this.attempt_pickup()
		},
		can_move: function () {
			return true
		},
		update: function (dt) {
			if (this.can_move()) {
				this.update_movement(dt)
				this.update_position(dt)
			}
		},
	})
	.addcomp(CharacterImage)
	.setmethodmode("can_move", "every")
	.setmethodmode("can_pickup", "every")


