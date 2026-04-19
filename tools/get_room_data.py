# python get_room_data.py [SteelStacks dir]/data/  | grep -v pygame > ../room_data.js

import sys, os, pathlib, pygame, pytmx, json
from pytmx.util_pygame import load_pygame

pygame.display.set_mode((384, 288))

path = sys.argv[1]
filenames = [f for f in os.listdir(path) if f.startswith("room") and f.endswith(".tmx")]
def filekey(fname):
	_, area, num = pathlib.Path(fname).stem.split("_")
	return area, int(num)
filenames.sort(key = filekey)

print("let room_data = {")
for filename in filenames:
	tmx_data = load_pygame(os.path.join(path, filename))
	blocks = {}
	checkpoint = None
	receivers = []
	doors = []
	for layer in tmx_data.visible_layers:
		if layer.name == "Blocks":
			assert isinstance(layer, pytmx.TiledTileLayer)
			for x, y, gid in layer:
				blocks[(x, y)] = tmx_data.tiledgidmap[gid] if gid > 0 else 0
		else:
			for obj in layer:
				pos = tilex, tiley = int(obj.x // 24), int(obj.y // 24)
				assert obj.x == tilex * 24 and obj.y == tiley * 24
				if layer.name == "Checkpoint":
					assert checkpoint is None
					checkpoint = pos
				elif layer.name == "Receivers":
					receivers.append(pos)
				elif layer.name == "Doors":
					doors.append(pos)
	area, num = filekey(filename)
	print('\t%s_%d: {' % (area, num))
	print('\t\ttiles: [')
	w, h = max(blocks)
	w += 1
	h += 1
	for y in range(h):
		bstrs = [f"{str(blocks[(x, y)]):>3s}," for x in range(w)]
		print('\t\t\t' + ''.join(bstrs))
	print('\t\t],')
	if checkpoint is not None:
		print(f"\t\tcheckpoint: %s," % json.dumps(checkpoint))
	print("\t\treceivers: %s," % json.dumps(receivers))
	print("\t\tdoors: %s," % json.dumps(doors))
	print('\t},')

print("}")


