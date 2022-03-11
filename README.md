# CrossyBear

## Setup instructions
- Clone the repo:
```console
git clone https://github.com/aditsharma-projects/CrossyBear.git
cd CrossyBear
```
- Run the following command from inside the project directory:
```console
python server.py
```

## Gameplay

In CrossyBear you are controlling the movements of bruin bear, a young cub estranged from his home in the forest. In order to get back home you must cross a perilous landscape filled with high traffic roadways, fast-moving river currents, and other obstacles while surviving the dangers they all pose. 
Below are the controls
- Move forward - _i_ key
- Turn left 45 degrees - _j_ key
- Turn right 45 degrees - _l_ key
- Jump backwards (equivalent to turn direction 180 degrees and jump forward) - _k_ key
- Toggle camera view - _c_ key

As you traverse the landscape, avoid the vehicles at all costs! Colliding with one will kill bruin bear and reset the game. Similarly, when crossing the water you must jump on logs/lilly pads to avoid death by drowning, as bruin bear cannot swim. 

### Tips

A few tips to help you bring bruin bear home
- Rapidly pressing the jump/forward key will allow you to skip the jump animation and move forward instantly, useful for when you need to move quickly and through tight gaps (eg. two moving vehicles)
- Jumping backwards has a persistant change on the player's heading. So if you want to move backwards for two jumps in a row, you must hit 'k' first and then 'i'. Hitting 'k' twice will move you backwards one unit and then backwards backwards (forward) one jump
