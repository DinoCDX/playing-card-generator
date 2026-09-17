from PIL import Image
import os

suits = ['spades', 'hearts', 'clubs', 'diamonds']
values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

print("Stitching animated flips...")
# Load the 5 frames of the card back shrinking
back_frames = [Image.open(f"cards/frames/back_scale_{i}.png").convert("RGBA") for i in range(5)]

for suit in suits:
    for value in values:
        # Load the 5 frames of the card front expanding
        front_frames = [Image.open(f"cards/frames/{suit}_{value}_scale_{i}.png").convert("RGBA") for i in range(5)]
        
        all_frames = back_frames + front_frames
        
        # By omitting the 'loop' parameter, the GIF will play exactly once and freeze on the final frame
        # disposal=2 prevents the previous frames from smearing underneath the transparency
        all_frames[0].save(
            f"cards/animated/{suit}_{value}.gif",
            save_all=True,
            append_images=all_frames[1:],
            duration=45, 
            disposal=2,
            transparency=0
        )
        
print("Done! All 52 animated emojis are in the cards/animated folder.")