import type { ExerciseEn } from "./types";

// ترجمه‌ی ../legs.ts — کلید = name فارسی
export const LEGS_EN: Record<string, ExerciseEn> = {
  "اسکوات هالتر بار پایین": {
    name: "Low Bar Back Squat",
    muscleGroup: "Glutes, Hamstrings, Quads",
    howTo: [
      "Place the barbell a bit lower than the traps, on the rear delts, and grip the bar firmly.",
      "Send your hips back and lean your torso slightly more forward than a regular squat.",
      "Go down until parallel and push through the whole foot to stand up, keeping your back straight.",
    ],
    benefits: "Gives better leverage for moving heavier loads and works the posterior chain more.",
  },
  "اسکوات هالتر مکث‌دار": {
    name: "Pause Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold the barbell on your back as in a regular squat and descend.",
      "Pause at the bottom for 2 to 3 seconds without relaxing your body.",
      "Stand up under control without bouncing.",
    ],
    benefits: "Builds strength from the bottom position and control of the movement, and removes the bounce out of the hole.",
  },
  "اسکوات هالتر تمپو": {
    name: "Tempo Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Choose a lighter weight than usual.",
      "Lower yourself slowly over 3 to 4 seconds.",
      "Pause for one second, then stand up at a normal speed.",
    ],
    benefits: "Increases time under tension for the muscles and cleans up your squat technique.",
  },
  "اسکوات پین هالتر": {
    name: "Pin Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Set the safety pins at the height of the lowest point of your squat.",
      "Lower until the bar rests on the pins, and release the pressure for a moment.",
      "Drive the bar up from a dead stop without bouncing.",
    ],
    benefits: "Targets starting strength from a dead stop and the sticking point in the middle of the lift.",
  },
  "اسکوات زرچر": {
    name: "Zercher Squat",
    muscleGroup: "Quads, Glutes, Core",
    howTo: [
      "Hold the barbell in the crooks of your elbows in front of your body.",
      "Keep your torso upright and lower yourself down.",
      "Push through your heels to stand up, keeping your elbows from dropping.",
    ],
    benefits: "Strongly works the core and upper back, and is a good alternative for people who find a bar on the back uncomfortable.",
  },
  "اسکوات اورهد": {
    name: "Overhead Squat",
    muscleGroup: "Quads, Shoulders, Core",
    howTo: [
      "Lock a barbell or light bar overhead with a wide grip.",
      "Lower yourself while keeping the bar directly above the middle of your feet.",
      "Stand up while keeping your arms straight the whole time.",
    ],
    benefits: "Tests and trains shoulder, hip and ankle mobility at the same time.",
  },
  "اسکوات اسمیت": {
    name: "Smith Machine Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand under the Smith bar with your feet slightly forward of your body.",
      "Unlock the bar and lower until parallel.",
      "Push through your heels to stand up, and lock the bar at the top.",
    ],
    benefits: "The fixed path lets you focus on your quads without worrying about balance.",
  },
  "اسکوات دمبل": {
    name: "Dumbbell Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold one dumbbell in each hand at your sides.",
      "Lower with your chest up as far as you can while keeping your back straight.",
      "Push through your heels to stand up.",
    ],
    benefits: "A simple home squat with adjustable load and low pressure on the spine.",
  },
  "اسکوات پا جلو دمبل": {
    name: "Dumbbell Front Squat",
    muscleGroup: "Quads, Core",
    howTo: [
      "Rest two dumbbells on your shoulders with your elbows pointing forward.",
      "Keep your torso upright and lower down.",
      "Push through the whole foot to stand up.",
    ],
    benefits: "A dumbbell version of the front squat that targets the quads without needing a rack.",
  },
  "اسکوات گابلت کتل‌بل": {
    name: "Kettlebell Goblet Squat",
    muscleGroup: "Quads, Glutes, Core",
    howTo: [
      "Hold a kettlebell by the handles in front of your chest.",
      "Push your knees out and squat deep.",
      "Pause at the bottom for a moment, then stand up.",
    ],
    benefits: "The weight in front of your body keeps your torso upright and makes reaching depth easier.",
  },
  "اسکوات سومو دمبل": {
    name: "Dumbbell Sumo Squat",
    muscleGroup: "Adductors, Glutes, Quads",
    howTo: [
      "Set your feet very wide with your toes pointing outward.",
      "Hold one dumbbell vertically between your legs.",
      "Lower until the dumbbell is close to the floor, then stand up by pushing through your heels.",
    ],
    benefits: "Works the inner thighs and glutes more than a regular squat.",
  },
  "اسکوات با کش": {
    name: "Banded Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand on a resistance band and loop the other end over your shoulders.",
      "Squat down as in a regular squat.",
      "Stand up with force; the band makes the top of the movement harder.",
    ],
    benefits: "A leg strength workout at home or on the road, with resistance that increases at the top of the movement.",
  },
  "اسکوات مینی‌بند": {
    name: "Mini Band Squat",
    muscleGroup: "Glutes (medius), Quads",
    howTo: [
      "Wrap a mini band just above your knees.",
      "Squat down while constantly pushing your knees outward.",
      "Stand up without letting your knees cave inward.",
    ],
    benefits: "Activates the gluteus medius and prevents the knees from collapsing inward.",
  },
  "اسکوات کیسه‌ی شنی": {
    name: "Sandbag Squat",
    muscleGroup: "Quads, Glutes, Core",
    howTo: [
      "Hug a sandbag against your chest.",
      "Keep your torso tight and squat down.",
      "Push through your heels to stand up.",
    ],
    benefits: "The unstable load challenges core stability and grip strength as well.",
  },
  "اسکوات کمربندی": {
    name: "Belt Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Fasten the machine belt around your hips and stand on the platform.",
      "Hold the handles and lower yourself down.",
      "Push through your legs to stand up.",
    ],
    benefits: "Trains the legs heavily without putting load on the spine.",
  },
  "اسکوات دستگاه پاندولی": {
    name: "Pendulum Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Place your shoulders under the pads and your back against the backrest.",
      "Squat deep, letting your knees move forward.",
      "Push through the whole foot to stand up.",
    ],
    benefits: "Very deep range of motion with low pressure on the lower back, one of the best options for the quads.",
  },
  "هاک اسکوات معکوس": {
    name: "Reverse Hack Squat",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Stand with your back against the pad of the hack squat machine, facing the back pad.",
      "Push your hips back and lower.",
      "Push through your heels to stand up and squeeze your glutes.",
    ],
    benefits: "A glute-focused version of the hack squat with the least pressure on the lower back.",
  },
  "اسکوات اسپلیت": {
    name: "Split Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand with one foot forward and one back, in a long step stance.",
      "Without moving your feet, lower your back knee toward the floor.",
      "Push through the front heel to stand up, then switch sides.",
    ],
    benefits: "A stationary version of the lunge that makes balance easier and focuses on each leg.",
  },
  "اسکوات اسپلیت دمبل": {
    name: "Dumbbell Split Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold one dumbbell in each hand with your feet in a long step stance.",
      "Lower your back knee close to the floor.",
      "Push through the front leg to stand up.",
    ],
    benefits: "Builds single-leg strength with extra load and relatively easy balance.",
  },
  "لانج بلغاری هالتر": {
    name: "Barbell Bulgarian Split Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Rest the barbell on your back and place the top of your rear foot on a bench.",
      "Lower straight down until the front thigh is parallel to the floor.",
      "Push through the front heel to stand up.",
    ],
    benefits: "Heavier load on the Bulgarian split squat for advanced single-leg strength.",
  },
  "لانج بلغاری اسمیت": {
    name: "Smith Machine Bulgarian Split Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand under the Smith bar and place your rear foot on a bench.",
      "Unlock the bar and lower down.",
      "Push through the front leg to stand up.",
    ],
    benefits: "The machine provides balance so you can focus on your front leg.",
  },
  "اسکوات تپانچه‌ای": {
    name: "Pistol Squat",
    muscleGroup: "Quads, Glutes, Balance",
    howTo: [
      "Stand on one leg with the other leg and your arms extended forward.",
      "Sit all the way down on the same leg, keeping your heel on the floor.",
      "Stand back up under control.",
    ],
    benefits: "The peak of single-leg strength and mobility in calisthenics.",
  },
  "اسکوات تک‌پا روی جعبه": {
    name: "Box Pistol Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand on one leg in front of a box or bench.",
      "Sit down onto the box under control.",
      "Stand up on the same leg.",
    ],
    benefits: "A stepping stone to the pistol squat with adjustable depth.",
  },
  "اسکوات شیرجه‌ای": {
    name: "Shrimp Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand on one leg and hold the other foot behind you with your hand.",
      "Slowly lower the knee of the back leg to the floor.",
      "Push through the front leg to stand up.",
    ],
    benefits: "Bodyweight single-leg work with strong emphasis on the quads.",
  },
  "اسکوات کوزاک": {
    name: "Cossack Squat",
    muscleGroup: "Adductors, Quads, Glutes",
    howTo: [
      "Set your feet very wide.",
      "Shift your weight onto one leg and squat down on that side, keeping the other leg straight.",
      "Stand up and repeat on the other side.",
    ],
    benefits: "Builds strength in the frontal plane along with inner thigh flexibility.",
  },
  "اسکوات هیندو": {
    name: "Hindu Squat",
    muscleGroup: "Quads, Endurance",
    howTo: [
      "Set your feet hip-width apart with your arms forward.",
      "Lower on the balls of your feet and pull your arms back.",
      "Rise up and keep the rhythm continuous.",
    ],
    benefits: "A traditional wrestler's squat for leg endurance and warm-up.",
  },
  "اسکوات دیواری": {
    name: "Wall Sit",
    muscleGroup: "Quads",
    howTo: [
      "Lean your back against a wall and slide down until your thighs are parallel to the floor.",
      "Keep your knees above your ankles.",
      "Hold for the set time and breathe slowly.",
    ],
    benefits: "A simple isometric exercise for quad endurance that needs no equipment.",
  },
  "اسکوات پالسی": {
    name: "Pulse Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Squat down and stay in the bottom position.",
      "Move up and down only in the lower third of the range.",
      "Do not stand fully up during the set and keep the muscle under tension.",
    ],
    benefits: "Raises the burn and leg endurance with bodyweight or light dumbbells.",
  },
  "اسکوات هالتر جلو اسمیت": {
    name: "Smith Machine Front Squat",
    muscleGroup: "Quads",
    howTo: [
      "Rest the Smith bar in front of your shoulders, with a crossed-arm or regular grip.",
      "Keep your torso upright and lower down.",
      "Push through the whole foot to stand up.",
    ],
    benefits: "A front squat with a fixed path that lets you focus fully on the quads.",
  },
  "اسکوات هالتر سیف‌تی بار": {
    name: "Safety Bar Squat",
    muscleGroup: "Quads, Glutes, Upper Back",
    howTo: [
      "Place the safety squat bar on your back and grip the handles in front.",
      "Keep your chest up and lower down.",
      "Drive up through your legs and keep your back from rounding.",
    ],
    benefits: "Puts less stress on the shoulders and wrists than a regular barbell, with more upper back work.",
  },
  "اسکوات لندماین": {
    name: "Landmine Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold the free end of a landmine bar with both hands in front of your chest.",
      "Lean slightly into the bar and lower down.",
      "Push through your heels to stand up.",
    ],
    benefits: "The arc of the bar makes learning the squat easy and safer for the lower back.",
  },
  "اسکوات TRX": {
    name: "TRX Squat",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold the TRX handles and lean back slightly.",
      "Use the handles for support and squat deep.",
      "Drive up through your legs and use your hands only for balance.",
    ],
    benefits: "A deep squat with hand support for beginners or for knee rehabilitation.",
  },
  "اسکوات کتل‌بل دوبل جلو": {
    name: "Double Kettlebell Front Squat",
    muscleGroup: "Quads, Core",
    howTo: [
      "Hold two kettlebells in the rack position in front of your shoulders.",
      "Brace your torso and squat deep.",
      "Stand up without letting the kettlebells drift forward.",
    ],
    benefits: "A heavy front load for the quads and core using kettlebells.",
  },
  "اسکوات جامپ دمبل": {
    name: "Dumbbell Jump Squat",
    muscleGroup: "Quads, Glutes, Power",
    howTo: [
      "Hold a light dumbbell in each hand at your sides.",
      "Lower halfway down and jump explosively.",
      "Land softly and go straight into the next rep.",
    ],
    benefits: "Builds leg explosive power with a light load.",
  },
  "لانج جانبی": {
    name: "Lateral Lunge",
    muscleGroup: "Adductors, Quads, Glutes",
    howTo: [
      "Take a long step out to the side.",
      "Send your hips back and sit onto that leg, keeping the other leg straight.",
      "Push off that foot to return to the start.",
    ],
    benefits: "Strengthens the legs in the frontal plane and stretches the inner thighs.",
  },
  "لانج جانبی دمبل": {
    name: "Dumbbell Lateral Lunge",
    muscleGroup: "Adductors, Quads, Glutes",
    howTo: [
      "Hold a dumbbell in front of your chest.",
      "Take a long step to the side and sit onto that leg.",
      "Push back to the start.",
    ],
    benefits: "A weighted lateral lunge that builds leg strength in several directions.",
  },
  "لانج ضربدری": {
    name: "Curtsy Lunge",
    muscleGroup: "Glutes (medius), Quads",
    howTo: [
      "Cross one leg behind the other leg.",
      "Lower until the back knee is close to the floor.",
      "Return to the start and switch to the other side.",
    ],
    benefits: "Targets the side of the glutes more than a regular lunge.",
  },
  "لانج معکوس هالتر": {
    name: "Barbell Reverse Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Rest the barbell on your back and take a big step backward.",
      "Lower the back knee close to the floor.",
      "Push through the front heel to return.",
    ],
    benefits: "A heavy lunge that puts less pressure on the front knee than a forward lunge.",
  },
  "لانج معکوس دمبل": {
    name: "Dumbbell Reverse Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Hold the dumbbells at your sides and step back.",
      "Lower down and keep your torso straight.",
      "Push through the front leg to return.",
    ],
    benefits: "Easier on the knees and keeps balance more manageable.",
  },
  "لانج معکوس از روی پله": {
    name: "Deficit Reverse Lunge",
    muscleGroup: "Glutes, Quads",
    howTo: [
      "Stand on a low step.",
      "Step one leg back and lower it below the level of the step.",
      "Go deep and return to the start with the foot on the step.",
    ],
    benefits: "A bigger range of motion means more stretch and more work for the glutes.",
  },
  "لانج رو به جلو هالتر": {
    name: "Barbell Forward Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Rest the barbell on your back and take a big step forward.",
      "Lower the back knee close to the floor.",
      "Push back to the start through the front heel.",
    ],
    benefits: "Builds leg strength and braking control under a heavy load.",
  },
  "لانج پیاده‌روی هالتر": {
    name: "Barbell Walking Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Rest the barbell on your back, step forward and lower down.",
      "Bring the back leg forward and take the next step.",
      "Keep going without stopping along the path.",
    ],
    benefits: "A heavier version of the walking lunge for leg volume and endurance.",
  },
  "لانج اسمیت": {
    name: "Smith Machine Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Stand under the Smith bar and place one foot back.",
      "Lower straight down.",
      "Push through the front leg to stand up.",
    ],
    benefits: "The fixed path lets you work one leg harder with more confidence.",
  },
  "لانج با کش": {
    name: "Banded Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Place the band under your front foot and hold the ends on your shoulders or in your hands.",
      "Lower until the back knee is close to the floor.",
      "Push through the front leg to stand up.",
    ],
    benefits: "A home lunge with adjustable resistance.",
  },
  "لانج پرشی": {
    name: "Jumping Lunge",
    muscleGroup: "Quads, Glutes, Power",
    howTo: [
      "Get into the lunge position.",
      "Jump explosively and switch the position of your legs in the air.",
      "Land softly in a lunge on the opposite side.",
    ],
    benefits: "Raises leg power and heart rate at the same time.",
  },
  "لانج کتل‌بل رک": {
    name: "Kettlebell Front Rack Lunge",
    muscleGroup: "Quads, Glutes, Core",
    howTo: [
      "Hold the kettlebells in the rack position in front of your shoulders.",
      "Step forward or back and lower down.",
      "Return and keep your torso straight.",
    ],
    benefits: "The front load also works the core.",
  },
  "لانج TRX": {
    name: "TRX Lunge",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Place your rear foot in the TRX strap.",
      "Lower down on the front leg and let the back foot slide back.",
      "Push through the front leg to stand up.",
    ],
    benefits: "Combines a Bulgarian split squat with instability for balance and strength.",
  },
  "استپ آپ هالتر": {
    name: "Barbell Step Up",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Rest the barbell on your back and stand in front of a box.",
      "Place one foot on the box and drive up through that same foot.",
      "Lower down under control.",
    ],
    benefits: "Heavy single-leg strength that transfers well to everyday movements.",
  },
  "استپ آپ جانبی": {
    name: "Lateral Step Up",
    muscleGroup: "Glutes (medius), Knee Stability",
    howTo: [
      "Stand beside a box.",
      "Place the near foot on the box and step up sideways.",
      "Lower slowly.",
    ],
    benefits: "Builds the gluteus medius and knee stability better than a regular step up.",
  },
  "استپ داون": {
    name: "Step Down",
    muscleGroup: "Quads",
    howTo: [
      "Stand on a step.",
      "Slowly lower the free leg until the heel touches the floor.",
      "Push up with the leg on the step.",
    ],
    benefits: "Controls the eccentric phase of the knee and is a common knee rehabilitation exercise.",
  },
  "ددلیفت دمبل": {
    name: "Dumbbell Deadlift",
    muscleGroup: "Hamstrings, Glutes, Lower Back",
    howTo: [
      "Hold two dumbbells in front of your thighs.",
      "Send your hips back and lower the dumbbells to the middle of your shins.",
      "Push your hips forward to stand up.",
    ],
    benefits: "Teaches the deadlift pattern with an easier load and without a barbell.",
  },
  "ددلیفت رومانیایی دمبل": {
    name: "Dumbbell RDL",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Hold the dumbbells in front of your thighs with your knees slightly bent.",
      "Push your hips back until you feel a stretch in the hamstrings.",
      "Squeeze your glutes to return to standing.",
    ],
    benefits: "Builds hamstring stretch and strength with more control on each side.",
  },
  "ددلیفت رومانیایی تک‌پا دمبل": {
    name: "Single-Leg Dumbbell RDL",
    muscleGroup: "Hamstrings, Glutes, Balance",
    howTo: [
      "Hold a dumbbell in the hand opposite to the standing leg.",
      "Hinge forward on one leg and extend the other leg behind you.",
      "Keep your hips level and return to standing.",
    ],
    benefits: "Corrects differences between the two legs and improves ankle stability.",
  },
  "ددلیفت کتل‌بل": {
    name: "Kettlebell Deadlift",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Place the kettlebell between your feet, with your hips back and your back straight.",
      "Grip the handle and stand up by pushing through your legs.",
      "Lower it back down under control.",
    ],
    benefits: "The best starting point for learning the hinge before swings or a barbell.",
  },
  "ددلیفت تراپ بار": {
    name: "Trap Bar Deadlift",
    muscleGroup: "Quads, Glutes, Hamstrings",
    howTo: [
      "Stand inside the trap bar and grip the handles.",
      "Keep your chest up and stand up by pushing through your legs.",
      "Lower it down under control.",
    ],
    benefits: "Less stress on the lower back than a regular deadlift, with the option to lift heavier loads.",
  },
  "ددلیفت کسری": {
    name: "Deficit Deadlift",
    muscleGroup: "Hamstrings, Glutes, Lower Back",
    howTo: [
      "Stand on a plate or a low platform.",
      "Grip the barbell with a straight back.",
      "Lift through the larger range of motion and stand up.",
    ],
    benefits: "Builds starting strength from the floor by increasing the range of motion.",
  },
  "ددلیفت پاصاف": {
    name: "Stiff-Leg Deadlift",
    muscleGroup: "Hamstrings, Lower Back",
    howTo: [
      "Hold the barbell in front of your thighs with your knees almost straight.",
      "Hinge forward from the hips and lower the barbell close to your legs.",
      "Push your glutes forward to stand up.",
    ],
    benefits: "A deeper hamstring stretch than the Romanian deadlift.",
  },
  "ددلیفت اسنچ گریپ": {
    name: "Snatch Grip Deadlift",
    muscleGroup: "Back, Hamstrings, Traps",
    howTo: [
      "Grip the barbell with a very wide grip.",
      "Keep your hips lower than in a regular deadlift and your back straight.",
      "Lift the bar and stand up.",
    ],
    benefits: "Works the upper back and traps more and increases the range of motion.",
  },
  "رومانیایی اسمیت": {
    name: "Smith Machine RDL",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Hold the Smith bar in front of your thighs.",
      "Push your hips back until you feel a hamstring stretch.",
      "Stand up by driving your glutes forward.",
    ],
    benefits: "A hinge with a fixed path to focus on the hamstrings.",
  },
  "گود مورنینگ دمبل": {
    name: "Dumbbell Good Morning",
    muscleGroup: "Hamstrings, Lower Back",
    howTo: [
      "Hold one dumbbell against your chest.",
      "Keep your knees slightly bent and hinge forward from the hips.",
      "Push your hips forward to return to standing.",
    ],
    benefits: "A lighter version of the good morning that teaches the hinge.",
  },
  "گود مورنینگ با کش": {
    name: "Banded Good Morning",
    muscleGroup: "Hamstrings, Lower Back",
    howTo: [
      "Stand on the band and place the other end behind your neck.",
      "Hinge forward from the hips.",
      "Push your hips forward to stand up.",
    ],
    benefits: "An excellent warm-up for the posterior chain before deadlifts or squats.",
  },
  "هیپ تراست اسمیت": {
    name: "Smith Machine Hip Thrust",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Rest your upper back on a bench with the Smith bar over your hips.",
      "Push through your heels to lift your hips until your body is straight.",
      "Squeeze your glutes at the top and lower slowly.",
    ],
    benefits: "A heavy hip thrust without having to balance a barbell.",
  },
  "هیپ تراست دستگاه": {
    name: "Hip Thrust Machine",
    muscleGroup: "Glutes",
    howTo: [
      "Sit on the machine and adjust the pad over your hips.",
      "Lift your hips and squeeze your glutes.",
      "Lower under control.",
    ],
    benefits: "Quick setup and a stable load for isolating the glutes.",
  },
  "هیپ تراست تک‌پا": {
    name: "Single-Leg Hip Thrust",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Rest your upper back on a bench, with one foot on the floor and the other leg raised.",
      "Push through the heel of the planted foot to lift your hips.",
      "Lower without rotating your hips.",
    ],
    benefits: "Strengthens each side of the glutes separately.",
  },
  "هیپ تراست دمبل": {
    name: "Dumbbell Hip Thrust",
    muscleGroup: "Glutes",
    howTo: [
      "Rest your upper back on a bench with a dumbbell over your hips.",
      "Lift your hips until your body is straight.",
      "Hold for one second and lower down.",
    ],
    benefits: "A simple hip thrust start with a light weight.",
  },
  "هیپ تراست با کش": {
    name: "Banded Hip Thrust",
    muscleGroup: "Glutes",
    howTo: [
      "Place the band over your hips and hold its ends under your hands or a weight.",
      "Lift your hips.",
      "Pause at the top and lower slowly.",
    ],
    benefits: "Glute training at home with resistance that increases at the top of the movement.",
  },
  "پل باسن": {
    name: "Glute Bridge",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Lie on your back with your knees bent and your feet flat on the floor.",
      "Push through your heels to lift your hips.",
      "Squeeze your glutes at the top and lower slowly.",
    ],
    benefits: "Simple glute activation that works as both a warm-up and a beginner exercise.",
  },
  "پل باسن تک‌پا": {
    name: "Single-Leg Glute Bridge",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Lie on your back with one foot on the floor and the other leg raised.",
      "Lift your hips with the foot on the floor.",
      "Keep your hips level and lower slowly.",
    ],
    benefits: "Finds and corrects imbalances between the glutes.",
  },
  "پل باسن هالتر": {
    name: "Barbell Glute Bridge",
    muscleGroup: "Glutes",
    howTo: [
      "Lie on the floor and place the barbell over your hips.",
      "Push through your heels to lift your hips.",
      "Pause at the top and lower.",
    ],
    benefits: "A shorter range of motion than the hip thrust, but allows heavy loads.",
  },
  "پل باسن پا روی توپ": {
    name: "Stability Ball Bridge",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Place your heels on the ball and lie on your back.",
      "Lift your hips until your body is straight.",
      "Lower slowly and keep the ball balanced.",
    ],
    benefits: "Trains the hamstrings and hip stability at the same time.",
  },
  "فراگ پامپ": {
    name: "Frog Pump",
    muscleGroup: "Glutes",
    howTo: [
      "Lie on your back, press the soles of your feet together and let your knees open.",
      "Lift your hips by squeezing your glutes.",
      "Repeat quickly and continuously.",
    ],
    benefits: "Intense glute activation with high reps and no pressure on the lower back.",
  },
  "ریورس هایپراکستنشن": {
    name: "Reverse Hyperextension",
    muscleGroup: "Glutes, Hamstrings, Lower Back",
    howTo: [
      "Lie face down on a bench or machine with your legs hanging off the edge.",
      "Raise your legs straight until they line up with your body.",
      "Lower under control.",
    ],
    benefits: "Strengthens the glutes and lower back with a gentle decompression of the spine, and can help with lower back pain.",
  },
  "هایپراکستنشن 45 درجه": {
    name: "45 Degree Back Extension",
    muscleGroup: "Lower Back, Glutes, Hamstrings",
    howTo: [
      "On the 45-degree machine, place your hips on the pad.",
      "Bend forward from the hips.",
      "Squeeze your glutes and raise your body until it lines up with your legs.",
    ],
    benefits: "The more common hyperextension version with adjustable emphasis on the glutes.",
  },
  "گلوت هم ریز": {
    name: "Glute Ham Raise",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "On the GHD machine, lock your feet in and rest your knees on the pad.",
      "Lower your straight body forward slowly.",
      "Pull your body back up by contracting the hamstrings.",
    ],
    benefits: "One of the strongest hamstring exercises, training both the knee and hip actions.",
  },
  "نوردیک کرل": {
    name: "Nordic Hamstring Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Kneel and lock your heels under a support.",
      "Lower your straight body forward slowly.",
      "Catch yourself with your hands and push back up with assistance.",
    ],
    benefits: "Proven to prevent hamstring injuries, with a focus on the eccentric phase.",
  },
  "لگ کرل خوابیده": {
    name: "Lying Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Lie face down on the machine with the pad above your heels.",
      "Pull your heels toward your glutes.",
      "Return slowly.",
    ],
    benefits: "The classic hamstring isolation exercise.",
  },
  "لگ کرل نشسته": {
    name: "Seated Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Sit on the machine and lock the thigh pad in place.",
      "Bend your legs downward and under the seat.",
      "Return under control.",
    ],
    benefits: "Works the hamstrings in a stretched position, which is great for growth.",
  },
  "لگ کرل ایستاده تک‌پا": {
    name: "Standing Single-Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Stand beside the machine with the pad behind your heel.",
      "Raise your heel toward your glutes.",
      "Lower slowly.",
    ],
    benefits: "Isolates each leg separately.",
  },
  "لگ کرل دمبل": {
    name: "Dumbbell Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Lie face down on a bench with a dumbbell between your feet.",
      "Raise your heels toward your glutes.",
      "Lower slowly.",
    ],
    benefits: "A replacement for the leg curl when the machine is not available.",
  },
  "لگ کرل با کش": {
    name: "Banded Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Anchor the band to a fixed post and loop it around your ankle.",
      "Lie face down and pull your heel toward your glutes.",
      "Return slowly.",
    ],
    benefits: "Hamstring training at home or as a warm-up.",
  },
  "لگ کرل روی توپ": {
    name: "Stability Ball Leg Curl",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Place your heels on the ball and lift your hips.",
      "Pull the ball toward your glutes with your heels.",
      "Keep your hips from dropping and roll the ball back.",
    ],
    benefits: "Trains the hamstrings and hip stability together.",
  },
  "لگ کرل سرسره‌ای": {
    name: "Slider Leg Curl",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Place your heels on a sliding disc or towel and lift your hips.",
      "Straighten your legs and pull them back toward your glutes.",
      "Keep your hips up the whole time.",
    ],
    benefits: "A leg curl without a machine, with strong eccentric load.",
  },
  "لگ اکستنشن تک‌پا": {
    name: "Single-Leg Extension",
    muscleGroup: "Quads",
    howTo: [
      "Sit on the machine and place only one leg behind the pad.",
      "Straighten your leg and hold it at the top for a moment.",
      "Lower slowly.",
    ],
    benefits: "Corrects strength differences between the two legs.",
  },
  "اکستنشن پا با کش": {
    name: "Banded Leg Extension",
    muscleGroup: "Quads",
    howTo: [
      "Sit on a chair and anchor the band behind you to your ankle.",
      "Straighten your knee.",
      "Return slowly.",
    ],
    benefits: "Quad isolation at home that suits knee rehabilitation.",
  },
  "اسپانیش اسکوات": {
    name: "Spanish Squat",
    muscleGroup: "Quads",
    howTo: [
      "Anchor a thick band to a post and loop it behind your knees.",
      "Lean back into the band and keep your shins vertical.",
      "Lower and rise.",
    ],
    benefits: "A popular exercise for patellar tendon pain that trains the quads without pressure on the knee.",
  },
  "پرس پا پاباز": {
    name: "Wide Stance Leg Press",
    muscleGroup: "Glutes, Adductors",
    howTo: [
      "Place your feet wider and higher on the platform.",
      "Lower the platform until your thighs come close to your chest.",
      "Push through your heels to move the platform away.",
    ],
    benefits: "Puts more emphasis on the glutes and inner thighs.",
  },
  "پرس پا پاجمع": {
    name: "Narrow Stance Leg Press",
    muscleGroup: "Quads",
    howTo: [
      "Place your feet close together and lower on the platform.",
      "Lower the platform under control.",
      "Push through the whole foot to return the platform.",
    ],
    benefits: "Puts more load on the quads, especially the outer part of the thigh.",
  },
  "پرس پا افقی": {
    name: "Horizontal Leg Press",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Sit on the machine and place your feet on the platform.",
      "Bend your knees toward your chest.",
      "Push the platform away with force.",
    ],
    benefits: "Suitable for beginners and for leg training with full control.",
  },
  "ساق پا تک‌پا دمبل": {
    name: "Single-Leg Dumbbell Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Stand on one leg at the edge of a step, holding a dumbbell in the hand on the same side.",
      "Lower your heel and then rise as high as you can.",
      "Pause at the top and lower slowly.",
    ],
    benefits: "Full range of motion and more load on each calf.",
  },
  "ساق پا اسمیت": {
    name: "Smith Machine Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Stand under the Smith bar with your toes on the plate.",
      "Lower your heels as far as you can.",
      "Rise onto your toes and pause.",
    ],
    benefits: "A heavy standing calf exercise with easy balance.",
  },
  "ساق پا هالتر ایستاده": {
    name: "Barbell Standing Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Rest the barbell on your back with your toes on a plate.",
      "Lower your heels.",
      "Rise onto your toes.",
    ],
    benefits: "A standing calf exercise that does not need a dedicated machine.",
  },
  "ساق پا وزن بدن": {
    name: "Bodyweight Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Stand on the edge of a step and hold the wall for balance.",
      "Lower your heel and then rise.",
      "Do many controlled reps.",
    ],
    benefits: "The simplest calf exercise for home.",
  },
  "ساق پا خرکی": {
    name: "Donkey Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Bend forward from the hips and rest your hands on a support.",
      "Place your toes on the edge and lower your heels.",
      "Rise onto your toes as high as you can.",
    ],
    benefits: "Greater stretch of the gastrocnemius because of the bent hips.",
  },
  "بالا آوردن پنجه": {
    name: "Tibialis Raise",
    muscleGroup: "Shin (Tibialis Anterior)",
    howTo: [
      "Lean your back against a wall with your feet slightly forward.",
      "Lift your toes as high as you can.",
      "Lower slowly.",
    ],
    benefits: "Strengthens the front of the shin and is useful for shin pain and knee health.",
  },
  "ساق پا پرشی": {
    name: "Pogo Jumps",
    muscleGroup: "Calves, Power",
    howTo: [
      "Stand on your toes with your knees almost straight.",
      "Bounce quickly and continuously using only your ankles.",
      "Keep ground contact short.",
    ],
    benefits: "Increases the spring of the Achilles tendon and running speed.",
  },
  "کیک‌بک باسن سیم‌کش": {
    name: "Cable Glute Kickback",
    muscleGroup: "Glutes",
    howTo: [
      "Attach the ankle strap to the low pulley of the cable machine.",
      "Lean forward slightly and extend your leg straight back.",
      "Squeeze your glutes and return slowly.",
    ],
    benefits: "Precise glute isolation with constant cable tension.",
  },
  "کیک‌بک باسن دستگاه": {
    name: "Glute Kickback Machine",
    muscleGroup: "Glutes",
    howTo: [
      "Get into the machine and place your leg on the pad.",
      "Push the leg back and up.",
      "Return under control.",
    ],
    benefits: "Full focus on the glutes with a fixed path.",
  },
  "کیک‌بک چهار دست و پا": {
    name: "Donkey Kick",
    muscleGroup: "Glutes",
    howTo: [
      "Get on your hands and knees.",
      "Raise one leg with a bent knee toward the ceiling.",
      "Keep your lower back from arching and return slowly.",
    ],
    benefits: "Activates the glutes without equipment and is suitable as a warm-up.",
  },
  "فایر هایدرنت": {
    name: "Fire Hydrant",
    muscleGroup: "Glutes (medius)",
    howTo: [
      "Get on your hands and knees.",
      "Raise the bent knee out to the side.",
      "Keep your hips from rotating and return slowly.",
    ],
    benefits: "Activates the side of the glutes for hip and knee stability.",
  },
  "ابداکشن خوابیده به پهلو": {
    name: "Side-Lying Hip Abduction",
    muscleGroup: "Glutes (medius)",
    howTo: [
      "Lie on your side with your legs straight and stacked.",
      "Raise the top leg with the heel slightly back.",
      "Lower slowly.",
    ],
    benefits: "A basic rehabilitation exercise for hip stability and knee pain.",
  },
  "ابداکشن سیم‌کش ایستاده": {
    name: "Cable Hip Abduction",
    muscleGroup: "Glutes (medius)",
    howTo: [
      "Attach the ankle strap to the low pulley and stand sideways to the machine.",
      "Raise the far leg out to the side.",
      "Return under control.",
    ],
    benefits: "Strengthens the gluteus medius with constant cable tension.",
  },
  "اداکشن سیم‌کش ایستاده": {
    name: "Cable Hip Adduction",
    muscleGroup: "Adductors",
    howTo: [
      "Attach the ankle strap to the pulley on the near side.",
      "Pull the leg from the side across toward the front of the other leg.",
      "Return slowly.",
    ],
    benefits: "Strengthens the inner thighs, which is important for knee and hip stability.",
  },
  "کلم‌شل": {
    name: "Clamshell",
    muscleGroup: "Glutes (medius)",
    howTo: [
      "Lie on your side with your knees bent and your heels together.",
      "Open the top knee like a clamshell, keeping your heels together.",
      "Close slowly.",
    ],
    benefits: "A classic physiotherapy movement for weak glutes and knee pain.",
  },
  "راه رفتن جانبی با مینی‌بند": {
    name: "Lateral Band Walk",
    muscleGroup: "Glutes (medius)",
    howTo: [
      "Place a mini band above your knees or around your ankles.",
      "In a half squat, take short steps to the side.",
      "Keep the band taut the whole time, then walk back.",
    ],
    benefits: "An excellent glute warm-up before leg training.",
  },
  "کوپن‌هاگن پلانک": {
    name: "Copenhagen Plank",
    muscleGroup: "Adductors, Obliques",
    howTo: [
      "Lie on your side on your elbow and place the top foot on a bench.",
      "Raise your hips until your body is straight.",
      "Hold for the set time, then switch sides.",
    ],
    benefits: "Proven to help prevent groin injuries.",
  },
  "اداکشن توپ نشسته": {
    name: "Seated Ball Squeeze",
    muscleGroup: "Adductors",
    howTo: [
      "Sit on a chair with a ball between your knees.",
      "Squeeze the ball firmly for 5 seconds.",
      "Release and repeat.",
    ],
    benefits: "A simple isometric exercise for the inner thighs and groin rehabilitation.",
  },
  "سگ پرنده": {
    name: "Bird Dog",
    muscleGroup: "Core, Lower Back, Glutes",
    howTo: [
      "Get on your hands and knees.",
      "Extend your right arm and left leg at the same time.",
      "Keep your back flat, return, and switch to the other side.",
    ],
    benefits: "Spinal stability, one of the golden exercises for lower back pain.",
  },
  "ددلیفت رومانیایی کتل‌بل تک‌پا": {
    name: "Kettlebell Single-Leg RDL",
    muscleGroup: "Hamstrings, Glutes, Balance",
    howTo: [
      "Hold the kettlebell in the hand opposite to the standing leg.",
      "Hinge forward on one leg.",
      "Squeeze your glutes to stand up.",
    ],
    benefits: "Trains balance, glutes and hamstrings at the same time.",
  },
  "پول-ترو با کش": {
    name: "Band Pull-Through",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Stand with your back to the anchor and take the band between your legs.",
      "Push your hips back.",
      "Squeeze your glutes to bring your hips forward and stand up.",
    ],
    benefits: "Learning the hinge with the least pressure on the lower back.",
  },
  "سوئینگ کتل‌بل تک‌دست": {
    name: "Single-Arm Kettlebell Swing",
    muscleGroup: "Glutes, Hamstrings, Core",
    howTo: [
      "Hold the kettlebell with one hand.",
      "Move your hips back and forward as in a regular swing.",
      "Keep your torso from rotating, then switch hands.",
    ],
    benefits: "Anti-rotation and powerful, and works the core more.",
  },
  "پرس پا اسمیت خوابیده": {
    name: "Smith Machine Reverse Leg Press",
    muscleGroup: "Quads, Glutes",
    howTo: [
      "Lie on your back under the Smith bar with your feet under the bar.",
      "Unlock the bar and bring your knees toward your chest.",
      "Push the bar away with your legs.",
    ],
    benefits: "A replacement for the leg press when the machine is not available.",
  },
};
