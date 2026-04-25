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
	this.set_pos_size(pos, [14, 24])
	this.vel = [0, 0]
	this.grounded = false
	this.move_x = 0
	this.jump_down = false
	this.jump_held = false
	this.facing_right = true
	this.is_centering = false
	this.centering_targetx = null
	this.picking_up = false
	this.centering_callback = null
	this.held_blocks = new HeldBlocks()

	// Half-widths (u is half of w, get it?)
	this.upickup = 9  // for picking up


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
Character.prototype = UFX.Thing()
	.addcomp(CollisionRect)
	.addcomp(DrawImageCentered)
	.addcomp({
		control: function (key) {
			this.move_x = (key.pressed.right ? 1 : 0) - (key.pressed.left ? 1 : 0)
			this.jump_held = key.pressed.jump
			this.jump_down = key.down.jump
			if (key.down.down) this.attempt_pickup()
		},
		jump: function () {
			let [vx, vy] = this.vel
			this.vel = [vx, -this.jump_speed]
			this.var_jump_timer = this.var_jump_time
			this.grounded = false
		},
		find_pickup_target_block: function () {
			if (!this.grounded) return null
			// TODO: check num blocks held < 3
			for (let obj of world.pickup_targets(this.get_anchor_bottom(), this.upickup)) {
				return obj
			}
			return null
		},
		attempt_pickup: function () {
			if (this.is_centering) return
			let target_block = this.find_pickup_target_block()
			if (!target_block) return
			this.centering_targetx = target_block.get_centerx()
			this.picking_up = true
			this.is_centering = true
			this.centering_callback = this.complete_pickup.bind(this, target_block)
		},
		finish_centering: function () {
			this.is_centering = false
			this.centering_finish_timer = 0.15
			this.centering_locked_position = this.get_pos()
			this.centering_target = null
		},
		complete_pickup: function (block) {
			this.picking_up = false
			this.set_centerx(this.centering_targetx)
			world.remove_ore(block)
			this.held_blocks.add_held(block)
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
			} else if (!this.centering_locked_position) {
				this.update_movement(dt)
				this.update_position(dt)
			} else {
				this.set_pos(this.centering_locked_position)
			}

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
			if (this.jump_down && this.coyote_timer > 0) this.jump()
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
			this.held_blocks.update_positions(this.get_anchor_top())
		},
		update_centering: function (dt) {
			if (!this.centering_target) {
				console.log("!this.centering_target")
				this.finish_centering()
				return
			}
			let centering_speed = 150
			if (this.approach(this.centering_target, centering_speed * dt)) {
				this.finish_centering()
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
			this.held_blocks.held.forEach(block => block.draw())
		},
	})


