import type { ExerciseEn } from "./types";

// ترجمه‌ی ../legacy.ts — کلید = name فارسی
export const LEGACY_EN: Record<string, ExerciseEn> = {
  "اسکوات هالتر": {
    name: "Barbell Back Squat",
    muscleGroup: "Quadriceps, Glutes, Hamstrings",
    howTo: [
      "Place the barbell on your upper back (traps), feet shoulder-width apart.",
      "Keeping your natural lower-back arch, sit down as if into a chair until at least your thighs are parallel to the floor.",
      "Drive through your heels to stand up, keeping your knees in line with your toes.",
    ],
    benefits: "The most fundamental lower-body movement. It builds overall leg and glute strength and size with the highest return for the time invested.",
  },
  "اسکوات گابلت": {
    name: "Goblet Squat",
    muscleGroup: "Quadriceps, Glutes, Core",
    howTo: [
      "Hold a dumbbell or kettlebell at chest height with both hands.",
      "Lower with your back straight, letting your elbows pass inside your knees.",
      "Push through your heels and stand back up.",
    ],
    benefits: "A beginner-friendly squat variation. You learn the right movement pattern before moving on to the barbell.",
  },
  "اسکوات پا جلو": {
    name: "Front Squat",
    muscleGroup: "Quadriceps",
    howTo: [
      "Hold the barbell in front of your shoulders (on the front delts), elbows high.",
      "Descend with a more upright torso than in a regular squat.",
      "Feel the work in your quads and stand back up.",
    ],
    benefits: "Puts more load on the quads and keeps the lower back under less stress.",
  },
  "اسکوات وزن بدن": {
    name: "Bodyweight Squat",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Stand with your feet shoulder-width apart and your arms in front of your body or behind your head.",
      "Without any weight, go down as far as is comfortable.",
      "Rise back up in a controlled way.",
    ],
    benefits: "Needs no equipment and is ideal for warming up or starting out.",
  },
  "اسکوات سومو": {
    name: "Sumo Squat",
    muscleGroup: "Quadriceps, Glutes, Inner thighs",
    howTo: [
      "Stand with your feet wider than shoulder-width, toes turned slightly outward.",
      "Keeping your back straight, lower down with your knees in line with your toes.",
      "Push through your heels and stand up.",
    ],
    benefits: "Puts more emphasis on the glutes and inner thighs, and is usually easier on the lower back.",
  },
  "هاک اسکوات": {
    name: "Hack Squat",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Lean your back against the machine pad, feet on the platform.",
      "Bend your knees to lower yourself.",
      "Push through your heels to move the platform away.",
    ],
    benefits: "Heavy loading on the quads with a fixed path and less stress on the lower back.",
  },
  "لانج با دمبل": {
    name: "Dumbbell Lunge",
    muscleGroup: "Quadriceps, Glutes, Balance",
    howTo: [
      "Take a long step forward so that your rear knee comes close to the floor.",
      "Keep your front knee from moving past your toes.",
      "Push through your front heel to return to the starting position.",
    ],
    benefits: "Builds leg strength along with single-leg balance and coordination.",
  },
  "لانج بلغاری": {
    name: "Bulgarian Split Squat",
    muscleGroup: "Quadriceps, Glutes, Balance",
    howTo: [
      "Rest the top of your rear foot on a bench.",
      "Lower with your front leg until your rear knee gets close to the floor.",
      "Push through your front heel to rise.",
    ],
    benefits: "Puts more load on the front leg and gives a deeper range of motion than a regular lunge.",
  },
  "لانج": {
    name: "Lunge",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Take a long step forward so that your rear knee comes close to the floor.",
      "Keep your torso upright and your front knee in line with your toes.",
      "Push through your front heel to return to the start.",
    ],
    benefits: "Strengthens single-leg power, balance and lower-body coordination.",
  },
  "ددلیفت": {
    name: "Deadlift",
    muscleGroup: "Hamstrings, Glutes, Lower back",
    howTo: [
      "Place the barbell close to your shins, feet hip-width apart.",
      "With a flat back and chest up, lift the barbell by driving your hips back and up.",
      "Stand tall and lock out your hips fully, without leaning back excessively.",
    ],
    benefits: "One of the three main strength lifts. It works the entire posterior chain of the body.",
  },
  "ددلیفت رومانیایی": {
    name: "Romanian Deadlift",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Hold the barbell or dumbbells in front of your thighs with a slight knee bend.",
      "Keeping your back flat, push your hips back and lower the weight to just below the knees.",
      "Stand up by squeezing your glutes and hamstrings.",
    ],
    benefits: "Focuses on the stretch and strength of the hamstrings, which also matters for knee health and injury prevention.",
  },
  "ددلیفت سومو": {
    name: "Sumo Deadlift",
    muscleGroup: "Hamstrings, Glutes, Inner thighs",
    howTo: [
      "Stand with your feet wider than shoulder-width and grip the barbell with your hands between your knees.",
      "With a flat back and chest up, lift the barbell.",
      "Stand up and lock your hips.",
    ],
    benefits: "Places less stress on the lower back than a conventional deadlift and also works the inner thighs.",
  },
  "ددلیفت تک‌پا": {
    name: "Single-Leg Deadlift",
    muscleGroup: "Hamstrings, Glutes, Balance",
    howTo: [
      "Stand on one leg, holding a weight (or nothing) in your hand.",
      "With a flat back, hinge forward and extend the other leg behind you until your torso is parallel to the floor.",
      "Return to the start in a controlled way.",
    ],
    benefits: "Besides the hamstrings, it trains ankle and hip stability very intensively.",
  },
  "هیپ تراست": {
    name: "Hip Thrust",
    muscleGroup: "Glutes",
    howTo: [
      "Rest your upper back against a bench, with the barbell over your hips.",
      "Drive through your heels to raise your hips until your body forms a straight line.",
      "Pause at the top and lower under control.",
    ],
    benefits: "The most direct movement for building glute size and strength.",
  },
  "هیپ تراست هالتر": {
    name: "Barbell Hip Thrust",
    muscleGroup: "Glutes",
    howTo: [
      "Rest your upper back against a bench, with the barbell over your hips.",
      "Drive through your heels to raise your hips until your body forms a straight line.",
      "Pause at the top and lower under control.",
    ],
    benefits: "The most direct movement for building glute size and strength.",
  },
  "هایپراکستنشن": {
    name: "Back Extension",
    muscleGroup: "Lower back, Glutes, Hamstrings",
    howTo: [
      "On the hyperextension bench, place your hips on the pad.",
      "Bend forward from the lower back in a controlled way.",
      "Squeeze your glutes and lower back to rise until your body forms a line.",
    ],
    benefits: "Builds lower-back strength and the posterior chain without the stress of a loaded barbell.",
  },
  "پرس پا": {
    name: "Leg Press",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Sit on the leg press machine with your feet shoulder-width apart on the platform.",
      "Bend your knees to about 90 degrees.",
      "Push through your heels to move the platform away, without fully locking your knees.",
    ],
    benefits: "Builds leg size with less stress on the lower back than a squat.",
  },
  "لگ اکستنشن": {
    name: "Leg Extension",
    muscleGroup: "Quadriceps",
    howTo: [
      "Sit on the machine and adjust the pad above your ankles.",
      "Straighten your knees to lift the weight.",
      "Lower it slowly under control.",
    ],
    benefits: "The most isolated exercise for the quads, good for pre-fatigue or muscle separation.",
  },
  "لگ کرل": {
    name: "Leg Curl",
    muscleGroup: "Hamstrings",
    howTo: [
      "Lie down or sit on the machine with the pad behind your ankles.",
      "Bend your knees to pull the weight toward your glutes.",
      "Return slowly under control.",
    ],
    benefits: "The most isolated exercise for the hamstrings, and a good complement to deadlifts and squats.",
  },
  "ساق پا ایستاده": {
    name: "Standing Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Stand on the edge of a step or platform with your heels hanging off the edge.",
      "Raise your heels as high as possible.",
      "Lower slowly under control until you feel a full stretch.",
    ],
    benefits: "Builds strength and size in the gastrocnemius (the twin calf muscle).",
  },
  "ساق پا نشسته": {
    name: "Seated Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Sit on the machine with the pad resting on your knees.",
      "Raise your heels by lifting the balls of your feet.",
      "Lower slowly under control.",
    ],
    benefits: "With the knee bent, it focuses more on the soleus muscle (under the calf).",
  },
  "ساق پا": {
    name: "Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Stand on the edge of a step or on flat ground.",
      "Rise onto your toes and raise your heels as high as you can.",
      "Pause briefly at the top and lower under control.",
    ],
    benefits: "Builds strength and size in the calf muscles.",
  },
  "پرس سینه هالتر": {
    name: "Barbell Bench Press",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Lie flat on a bench with the barbell above your chest.",
      "Lower it under control until it is close to your chest.",
      "Press back up without jerking your elbows into a lockout.",
    ],
    benefits: "The most fundamental upper-body movement for chest strength and size.",
  },
  "پرس سینه با دمبل": {
    name: "Dumbbell Chest Press",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Lie on a bench with a dumbbell in each hand above your chest.",
      "Lower the dumbbells under control until you feel a stretch in your chest.",
      "Press back up.",
    ],
    benefits: "Gives a greater range of motion than the barbell and works each side of the body independently.",
  },
  "پرس سینه دمبل": {
    name: "Dumbbell Bench Press",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Lie on a bench with a dumbbell in each hand above your chest.",
      "Lower the dumbbells under control until you feel a stretch in your chest.",
      "Press back up.",
    ],
    benefits: "Gives a greater range of motion than the barbell and works each side of the body independently.",
  },
  "پرس سینه اسمیت": {
    name: "Smith Machine Bench Press",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Lie on a bench under the Smith machine, with the bar above your chest.",
      "Lower it under control.",
      "Press up. The machine fixes the movement path.",
    ],
    benefits: "The fixed path lets you focus fully on pressing without worrying about balancing the weight.",
  },
  "پرس شیب‌دار دمبل": {
    name: "Incline Dumbbell Press",
    muscleGroup: "Upper chest, Shoulders",
    howTo: [
      "Set the bench to a 30-45 degree incline.",
      "Lower and raise the dumbbells from above your upper chest.",
      "At the top, bring them slightly inward for a full contraction.",
    ],
    benefits: "Focuses more on the upper part of the chest, which is less engaged in a flat press.",
  },
  "پرس شیب‌دار هالتر": {
    name: "Incline Barbell Bench Press",
    muscleGroup: "Upper chest, Shoulders",
    howTo: [
      "Set the bench to a 30-45 degree incline.",
      "Lower the barbell under control from above your upper chest.",
      "Press back up.",
    ],
    benefits: "Allows heavier loading on the upper chest than the dumbbell version.",
  },
  "فلای دمبل": {
    name: "Dumbbell Fly",
    muscleGroup: "Chest",
    howTo: [
      "Lie on a bench with the dumbbells above your chest and your elbows slightly bent.",
      "Open your arms out to the sides, as if hugging, until you feel a stretch in your chest.",
      "Bring your arms back up by contracting your chest.",
    ],
    benefits: "The most isolated exercise for the width and shape of the chest muscle.",
  },
  "فلای سیم‌کش": {
    name: "Cable Fly",
    muscleGroup: "Chest",
    howTo: [
      "Grip the handles on both sides and stand slightly forward.",
      "With your elbows slightly bent, bring your hands together in front of your chest.",
      "Return to the start under control.",
    ],
    benefits: "Constant cable resistance through the full range of motion keeps steady tension on the chest.",
  },
  "شنا سوئدی": {
    name: "Push Up",
    muscleGroup: "Chest, Shoulders, Triceps, Core",
    howTo: [
      "Place your hands slightly wider than shoulder-width, keeping your body in a straight line.",
      "Lower yourself under control until you are close to the floor.",
      "Push back up without letting your lower back sag.",
    ],
    benefits: "A bodyweight compound movement for upper-body strength and core stability.",
  },
  "شنا سوئدی روی زانو": {
    name: "Knee Push Up",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Place your hands slightly wider than your shoulders, with your knees on the floor.",
      "Keep your body in a line from knees to head, and don't let your hips drop.",
      "Lower and push up in a controlled way.",
    ],
    benefits: "A simpler version of the push-up that builds the base strength needed before doing the full version.",
  },
  "دیپ": {
    name: "Dip",
    muscleGroup: "Lower chest, Triceps, Shoulders",
    howTo: [
      "On the parallel bars, hold your body up with your arms.",
      "Lower under control until you feel a stretch in your chest and arms.",
      "Push back up.",
    ],
    benefits: "A powerful compound movement for the lower chest and triceps.",
  },
  "دیپ وزنه‌دار": {
    name: "Weighted Dip",
    muscleGroup: "Lower chest, Triceps, Shoulders",
    howTo: [
      "Attach a weight belt or hold a dumbbell between your feet.",
      "Climb onto the parallel bars and lower until your elbows reach about 90 degrees.",
      "Push your hands back up without shrugging your shoulders.",
    ],
    benefits: "Progression beyond bodyweight, for when the regular dip is no longer challenging.",
  },
  "زیربغل هالتر خم": {
    name: "Bent Over Barbell Row",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "With a flat back and a slight knee bend, bend your torso to about 45 degrees.",
      "Pull the barbell toward your stomach, keeping your elbows close to your body.",
      "Lower it under control.",
    ],
    benefits: "The most fundamental upper-body rowing movement for back width and thickness.",
  },
  "زیربغل هالتر": {
    name: "Barbell Row",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "With a flat back and a slight knee bend, bend your torso to about 45 degrees.",
      "Pull the barbell toward your stomach, keeping your elbows close to your body.",
      "Lower it under control.",
    ],
    benefits: "The most fundamental upper-body rowing movement for back width and thickness.",
  },
  "زیربغل با کش": {
    name: "Band Row",
    muscleGroup: "Back, Lats",
    howTo: [
      "Wrap the band around a fixed point or hold it under your feet.",
      "Pull the handles toward your stomach by driving your elbows back.",
      "Return to the start under control.",
    ],
    benefits: "A no-machine alternative to the lat row, for home or when equipment is limited.",
  },
  "زیربغل تک‌دست دمبل": {
    name: "One-Arm Dumbbell Row",
    muscleGroup: "Back, Lats",
    howTo: [
      "Place one knee and one hand on a bench, with your torso parallel to the floor.",
      "Pull the dumbbell toward your hip with your other hand.",
      "Lower it under control.",
    ],
    benefits: "One-sided work corrects strength imbalances between the two sides of the back.",
  },
  "زیربغل تی-بار": {
    name: "T-Bar Row",
    muscleGroup: "Back, Lats",
    howTo: [
      "Bend over the T-bar and grip the handle with both hands.",
      "Pull toward your stomach, keeping your elbows close to your body.",
      "Lower under control.",
    ],
    benefits: "Allows heavier loading with less stress on the lower back than a free barbell row.",
  },
  "زیربغل سیمکش": {
    name: "Seated Cable Row",
    muscleGroup: "Back, Lats",
    howTo: [
      "Sit on the machine, grip the handle and lean back slightly.",
      "Pull the handle toward your stomach and squeeze your shoulder blades together.",
      "Return forward under control.",
    ],
    benefits: "Constant resistance through the full range of motion, good for learning to feel the back muscles contract.",
  },
  "زیربغل لت": {
    name: "Lat Pulldown",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Sit on the lat pulldown machine and grip the bar slightly wider than shoulder-width.",
      "Pull the bar toward your upper chest, leaning your chest slightly forward.",
      "Return it up under control.",
    ],
    benefits: "A good alternative to pull-ups for when you don't yet have the strength for bodyweight.",
  },
  "پول‌اور": {
    name: "Pullover",
    muscleGroup: "Back, Chest, Core",
    howTo: [
      "Lie on a bench holding one dumbbell with both hands above your chest.",
      "With a slight elbow bend, lower the dumbbell behind your head to the limit of the stretch.",
      "Return it to the start by contracting your back and chest.",
    ],
    benefits: "Gives a good stretch to the chest and also works the lats (the wings of the back).",
  },
  "بارفیکس": {
    name: "Pull Up",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Grip the bar slightly wider than shoulder-width.",
      "Pull your elbows down until your chin passes above the bar.",
      "Lower yourself under control.",
    ],
    benefits: "One of the best bodyweight movements for back width and pulling strength.",
  },
  "بارفیکس یا کول‌آپ": {
    name: "Pull Up or Chin Up",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "If a full pull-up is too hard, try a chin-up (palms facing you).",
      "Pull your elbows down until your chin passes above the bar.",
      "Lower yourself under control.",
    ],
    benefits: "The chin-up puts more load on the biceps and is easier for beginners.",
  },
  "بارفیکس وزنه‌دار": {
    name: "Weighted Pull Up",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Attach a weight with a dedicated belt or hold it between your feet.",
      "Start from a dead hang with your arms straight.",
      "Like a regular pull-up, bring your chin above the bar, then lower slowly.",
    ],
    benefits: "Progression beyond bodyweight, for when the regular pull-up is no longer challenging.",
  },
  "کول‌آپ کمکی": {
    name: "Assisted Chin Up",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Use a band or assisted machine to offset part of your body weight.",
      "With your palms facing you, bring your chin above the bar.",
      "Lower slowly until your arms are straight, and gradually reduce the assistance.",
    ],
    benefits: "A gradual path to your first unassisted pull-up.",
  },
  "پرس سرشانه هالتر": {
    name: "Overhead Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Hold the barbell in front of your shoulders with your feet firmly on the floor.",
      "Press straight overhead until your elbows are fully extended.",
      "Lower it back to your shoulders under control.",
    ],
    benefits: "Builds shoulder strength and size with a free weight and engages the core.",
  },
  "پرس سرشانه با دمبل": {
    name: "Standing Dumbbell Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Hold one dumbbell in each hand at shoulder height.",
      "Press overhead.",
      "Lower under control.",
    ],
    benefits: "A more natural range of motion and more stabilizer muscle activation than the barbell version.",
  },
  "پرس سرشانه دمبل": {
    name: "Dumbbell Shoulder Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Hold one dumbbell in each hand at shoulder height.",
      "Press overhead.",
      "Lower under control.",
    ],
    benefits: "A more natural range of motion and more stabilizer muscle activation than the barbell version.",
  },
  "پرس سرشانه دمبل سبک": {
    name: "Light Dumbbell Shoulder Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Using a light weight, hold a dumbbell in each hand above your shoulders.",
      "Keep your back straight and your abs tight.",
      "Press overhead and lower back down with full control.",
    ],
    benefits: "For cutting phases or physical limitations, the same pattern with lower risk.",
  },
  "پرس آرنولد": {
    name: "Arnold Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Hold the dumbbells in front of your shoulders with your palms facing you.",
      "As you press up, rotate your wrists so that your palms face forward.",
      "Lower with the same rotation under control.",
    ],
    benefits: "The extra rotation works all three heads of the deltoid more than a regular press.",
  },
  "نشر جانبی دمبل": {
    name: "Dumbbell Lateral Raise",
    muscleGroup: "Side deltoids",
    howTo: [
      "Hold a dumbbell in each hand at your sides.",
      "With a slight elbow bend, raise your arms out to the sides up to shoulder height.",
      "Lower under control.",
    ],
    benefits: "The most isolated exercise for shoulder width and a broader upper-body look.",
  },
  "نشر جانبی": {
    name: "Lateral Raise",
    muscleGroup: "Side deltoids",
    howTo: [
      "Hold a dumbbell in each hand at your sides.",
      "With a slight elbow bend, raise your arms out to the sides up to shoulder height.",
      "Lower under control.",
    ],
    benefits: "The most isolated exercise for shoulder width and a broader upper-body look.",
  },
  "نشر جانبی سیم‌کش": {
    name: "Cable Lateral Raise",
    muscleGroup: "Side deltoids",
    howTo: [
      "Stand beside the cable machine and grip the handle with the far hand.",
      "With a slight elbow bend, raise your arm up to shoulder height.",
      "Lower under control.",
    ],
    benefits: "Constant cable resistance keeps tension on the shoulder even at the bottom of the movement.",
  },
  "نشر خم به جلو": {
    name: "Bent Over Reverse Fly",
    muscleGroup: "Front deltoids",
    howTo: [
      "Hold a dumbbell in each hand in front of your thighs.",
      "With straight elbows, raise your hands forward to shoulder height.",
      "Lower under control.",
    ],
    benefits: "Isolates the front deltoid and is a good complement to heavy presses.",
  },
  "فیس‌پول": {
    name: "Face Pull",
    muscleGroup: "Rear deltoids, Upper back",
    howTo: [
      "Set the rope at face height on the cable machine.",
      "Pull the rope toward your face by driving your elbows outward.",
      "Return forward under control.",
    ],
    benefits: "Strengthens the rear deltoids and the muscles between the shoulder blades, which is important for posture and shoulder health.",
  },
  "شراگ هالتر": {
    name: "Barbell Shrug",
    muscleGroup: "Traps",
    howTo: [
      "Hold the barbell in front of your thighs with straight arms.",
      "Raise the barbell only by lifting your shoulders (no rolling).",
      "Pause at the top and lower under control.",
    ],
    benefits: "Builds the size and strength of the upper traps.",
  },
  "شراگ دمبل": {
    name: "Dumbbell Shrug",
    muscleGroup: "Traps",
    howTo: [
      "Hold a dumbbell in each hand at your sides.",
      "Raise the dumbbells only by lifting your shoulders.",
      "Pause at the top and lower under control.",
    ],
    benefits: "Builds the size and strength of the upper traps.",
  },
  "جلوبازو دمبل": {
    name: "Dumbbell Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Hold a dumbbell in each hand with your elbows close to your body.",
      "Curl the dumbbell up by bending your elbow.",
      "Lower under control.",
    ],
    benefits: "A classic single-joint movement for biceps size.",
  },
  "جلوبازو هالتر": {
    name: "Barbell Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Grip the barbell with your hands slightly wider than shoulder-width apart.",
      "Curl it up by bending your elbows, without swinging your body.",
      "Lower under control.",
    ],
    benefits: "Allows heavier loading with both hands at once.",
  },
  "جلوبازو لاری": {
    name: "Preacher Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Grip the EZ bar with your hands at a comfortable angle.",
      "Keep your elbows fixed on the preacher pad and curl up.",
      "Lower under control.",
    ],
    benefits: "Keeping the upper arm fixed removes any body swinging, for full isolation.",
  },
  "جلوبازو چکشی": {
    name: "Hammer Curl",
    muscleGroup: "Biceps, Forearms",
    howTo: [
      "Hold a dumbbell in each hand with a neutral grip (palms facing your body).",
      "Curl the dumbbell up keeping the same wrist angle.",
      "Lower under control.",
    ],
    benefits: "Besides the biceps, it also builds the forearm muscles and the brachialis (the side of the upper arm).",
  },
  "جلوبازو سیم‌کش": {
    name: "Cable Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Grip the low pulley handle with your elbows close to your body.",
      "Curl up by bending your elbows.",
      "Lower under control.",
    ],
    benefits: "Constant cable resistance keeps tension even at the bottom of the movement.",
  },
  "پشت‌بازو سیمکش": {
    name: "Tricep Pushdown",
    muscleGroup: "Triceps",
    howTo: [
      "Grip the cable handle from above with your elbows close to your body.",
      "Straighten your elbows and push the handle down.",
      "Return up under control.",
    ],
    benefits: "Isolates the triceps with constant cable resistance.",
  },
  "پشت بازو هالتر خوابیده": {
    name: "Skull Crusher",
    muscleGroup: "Triceps",
    howTo: [
      "Lie on a bench with an EZ bar above your forehead.",
      "Lower the bar toward your forehead by bending only at the elbows.",
      "Straighten your elbows to return to the start.",
    ],
    benefits: "A deep stretch and strong isolation for all three heads of the triceps.",
  },
  "پشت بازو دمبل تک‌دست": {
    name: "Overhead Dumbbell Triceps Extension",
    muscleGroup: "Triceps",
    howTo: [
      "Bend your torso forward, with your upper arm parallel to the floor and your elbow at 90 degrees.",
      "Straighten your elbow and push the dumbbell back.",
      "Return under control.",
    ],
    benefits: "One-sided work helps isolate each arm and correct strength imbalances between them.",
  },
  "پشت بازو روی نیمکت": {
    name: "Bench Dip",
    muscleGroup: "Triceps",
    howTo: [
      "Place your hands behind you on the edge of a bench, with your legs extended in front.",
      "Lower yourself by bending your elbows.",
      "Push up through your hands to return.",
    ],
    benefits: "An equipment-free triceps exercise, doable anywhere there is a bench or chair.",
  },
  "مچ دست هالتر": {
    name: "Barbell Wrist Curl",
    muscleGroup: "Forearms",
    howTo: [
      "Rest your forearms on your knees or a bench and hold the barbell palms up.",
      "Raise the barbell using only your wrists.",
      "Lower under control.",
    ],
    benefits: "Builds forearm strength and endurance, which also helps your grip.",
  },
  "پلانک": {
    name: "Plank",
    muscleGroup: "Core (abs, lower back)",
    howTo: [
      "Get on your forearms and toes, keeping your body in a straight line.",
      "Keep your abs tight and don't let your hips rise or drop.",
      "Hold for the target time.",
    ],
    benefits: "Strengthens core stability without putting pressure on the spine.",
  },
  "پلانک بارگذاری‌شده": {
    name: "Weighted Plank",
    muscleGroup: "Core (abs, lower back)",
    howTo: [
      "Have someone place a light weight plate on your upper back.",
      "Get on your elbows and keep your body straight.",
      "Hold for the target time, then remove the weight.",
    ],
    benefits: "Progression beyond the regular plank, for when holding time is no longer challenging.",
  },
  "پلانک جانبی": {
    name: "Side Plank",
    muscleGroup: "Core (obliques)",
    howTo: [
      "Lie on your side on one forearm and the edge of your foot, keeping your body in a straight line.",
      "Keep your hips raised and don't let them drop.",
      "Hold for the target time, then switch sides.",
    ],
    benefits: "Targets the obliques and lateral hip stability.",
  },
  "کرانچ": {
    name: "Crunch",
    muscleGroup: "Abs",
    howTo: [
      "Lie on your back with your knees bent and your hands by your head or on your chest.",
      "Contract your abs to lift your shoulders off the floor.",
      "Lower under control.",
    ],
    benefits: "A classic isolation movement for the rectus abdominis (the six-pack muscle).",
  },
  "کرانچ سیم‌کش": {
    name: "Cable Crunch",
    muscleGroup: "Abs",
    howTo: [
      "Kneel and hold the rope attachment beside your head.",
      "Flex your spine (not just your shoulders) to bring your torso down toward your thighs.",
      "Return up under control.",
    ],
    benefits: "Allows gradual loading of the abs, unlike a bodyweight crunch.",
  },
  "زانو بغل معلق": {
    name: "Hanging Knee Raise",
    muscleGroup: "Lower abs",
    howTo: [
      "Hang from a bar with your legs straight or your knees bent.",
      "Contract your abs to bring your knees or legs up toward your hips.",
      "Lower under control without swinging.",
    ],
    benefits: "Works the lower abs through a full range of motion.",
  },
  "راشین تویست": {
    name: "Russian Twist",
    muscleGroup: "Obliques",
    howTo: [
      "Sit with your knees bent and lean back slightly.",
      "With or without a weight, rotate your torso to each side.",
      "Repeat in a controlled way without rushing.",
    ],
    benefits: "Strengthens the obliques and torso rotation.",
  },
  "برپی": {
    name: "Burpee",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "From standing, drop into a squat and then a plank (a push-up is optional).",
      "Jump your feet forward toward your hands.",
      "Finish with a vertical jump.",
    ],
    benefits: "A high-intensity full-body movement that raises your heart rate and burns calories.",
  },
  "پرش جعبه": {
    name: "Box Jump",
    muscleGroup: "Quadriceps, Glutes, Power",
    howTo: [
      "Stand in front of a sturdy box or platform.",
      "Bend your knees and swing your arms, then jump onto the box.",
      "Step down softly from the box and repeat.",
    ],
    benefits: "Builds explosive leg power, useful for speed and jumping sports.",
  },
  "اسکوات جامپ": {
    name: "Jump Squat",
    muscleGroup: "Quadriceps, Glutes, Power",
    howTo: [
      "Lower yourself as in a regular squat.",
      "Explode up off your heels into a jump.",
      "Land softly and start the next rep right away.",
    ],
    benefits: "Builds explosive leg power and quickly raises your heart rate.",
  },
  "تناوبی دویدن": {
    name: "Interval Running",
    muscleGroup: "Cardio",
    howTo: [
      "Run at a high intensity for the set interval.",
      "Recover with low intensity or walking.",
      "Repeat this cycle as planned.",
    ],
    benefits: "Highly efficient for improving aerobic and anaerobic capacity and for burning calories in a short time.",
  },
  "طناب زدن": {
    name: "Jump Rope",
    muscleGroup: "Cardio, Calves",
    howTo: [
      "Turn the rope with your wrists, not your whole arms.",
      "Keep your elbows close to your body.",
      "Jump with short hops on the balls of your feet.",
    ],
    benefits: "A low-impact cardio with high coordination and good calorie burn.",
  },
  "دویدن آرام": {
    name: "Jogging",
    muscleGroup: "Cardio",
    howTo: [
      "Run at a pace where you can still talk (Zone 2).",
      "Take short steps and land beneath your body.",
      "Maintain steady breathing and rhythm.",
    ],
    benefits: "Builds the base of aerobic endurance without heavy stress on the body.",
  },
  "دویدن تمپو": {
    name: "Tempo Run",
    muscleGroup: "Cardio",
    howTo: [
      "Warm up with 10 minutes of easy jogging.",
      "Run at a hard but controllable pace (not a sprint).",
      "Hold the rhythm until the end of the target time, then cool down.",
    ],
    benefits: "Raises your anaerobic threshold and sustainable speed.",
  },
  "دویدن یا دوچرخه": {
    name: "Run or Cycle",
    muscleGroup: "Cardio",
    howTo: [
      "Warm up for a few minutes at low intensity.",
      "Do one of the two options at a moderate, continuous intensity.",
      "Maintain the rhythm until the end of the target time.",
    ],
    benefits: "Low-stress cardio for fat-loss phases or active recovery.",
  },
  "دوچرخه ثابت": {
    name: "Stationary Bike",
    muscleGroup: "Cardio, Quadriceps",
    howTo: [
      "Adjust the seat height so your knee does not fully straighten at the bottom point.",
      "Warm up for a few minutes at low resistance.",
      "Pedal at the target intensity (easy, tempo or interval).",
    ],
    benefits: "Joint-friendly cardio, suitable for recovery days.",
  },
  "پیاده‌روی تند یا دوی سبک": {
    name: "Brisk Walk or Light Jog",
    muscleGroup: "Cardio",
    howTo: [
      "Move at a pace where you are slightly out of breath but can still talk.",
      "Swing your arms, bent at the elbows, in rhythm with your legs.",
      "Increase the time or distance a little every week.",
    ],
    benefits: "The lowest-impact cardio, suitable for beginners and recovery days.",
  },
  "کشش کامل بدن": {
    name: "Full Body Stretch",
    muscleGroup: "Flexibility",
    howTo: [
      "Stretch each main muscle group (legs, back, chest, shoulders) for 20-30 seconds.",
      "Avoid bouncing; hold a steady stretch.",
      "Breathe slowly and deeply, and stretch to the edge of tension, not pain.",
    ],
    benefits: "Maintains joint range of motion and reduces the risk of injury.",
  },
  "باکس اسکوات": {
    name: "Box Squat",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Stand in front of a box or low bench with the barbell on your upper back.",
      "Lower until your hips touch the box, without fully sitting.",
      "Push through your heels to stand.",
    ],
    benefits: "Controls the depth of the movement and helps you learn the correct squat pattern.",
  },
  "لانج معکوس": {
    name: "Reverse Lunge",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "Take a long step backward so that your rear knee comes close to the floor.",
      "Keep your torso upright and your weight on your front leg.",
      "Push through your front heel to return to the start.",
    ],
    benefits: "Puts less stress on the front knee than a forward lunge.",
  },
  "لانج پیاده‌روی": {
    name: "Walking Lunge",
    muscleGroup: "Quadriceps, Glutes, Balance",
    howTo: [
      "Perform a lunge with each step, moving forward instead of returning.",
      "Keep your front knee from moving past your toes.",
      "Keep your torso upright and continue without stopping.",
    ],
    benefits: "Besides strength, it trains coordination and balance while you move.",
  },
  "گابلت لانج": {
    name: "Goblet Lunge",
    muscleGroup: "Quadriceps, Glutes, Core",
    howTo: [
      "Hold a dumbbell or kettlebell in front of your chest.",
      "Take a long step and perform a lunge.",
      "Push through your front heel to return.",
    ],
    benefits: "A weight held in front of the body also engages the core along with the legs.",
  },
  "استپ آپ": {
    name: "Step Up",
    muscleGroup: "Quadriceps, Glutes, Balance",
    howTo: [
      "Stand in front of a platform or bench and place one whole foot on it.",
      "Push through that same leg to rise until the other leg also comes up.",
      "Lower back down under control.",
    ],
    benefits: "Builds single-leg strength and knee and ankle stability with a movement close to daily life.",
  },
  "سیسی اسکوات": {
    name: "Sissy Squat",
    muscleGroup: "Quadriceps",
    howTo: [
      "Keep your heels raised, or hold on to something for balance.",
      "Bend your knees deeply without bending at the hips, and lean your torso back and down.",
      "Push through your quads to rise.",
    ],
    benefits: "Intense isolation of the quads with a deep stretch.",
  },
  "گود مورنینگ": {
    name: "Good Morning",
    muscleGroup: "Hamstrings, Glutes, Lower back",
    howTo: [
      "Rest the barbell on your upper back with your feet shoulder-width apart.",
      "With a flat back and a slight knee bend, hinge your torso forward from the hips.",
      "Stand up by squeezing your glutes and hamstrings.",
    ],
    benefits: "Builds posterior-chain and lower-back strength without lifting the weight from the floor.",
  },
  "پول-ترو سیم‌کش": {
    name: "Cable Pull Through",
    muscleGroup: "Hamstrings, Glutes",
    howTo: [
      "Grip the rope from the low pulley, standing with your back to the machine.",
      "With a flat back, push your hips back and bring the rope between your legs.",
      "Stand up by squeezing your glutes.",
    ],
    benefits: "Trains the hinge pattern with constant resistance and low stress on the lower back.",
  },
  "کیک‌بک باسن": {
    name: "Glute Kickback",
    muscleGroup: "Glutes",
    howTo: [
      "Attach the cable handle or a band around your ankle.",
      "With your torso slightly bent, push your leg straight back.",
      "Return under control.",
    ],
    benefits: "Direct isolation of the glutes, a good complement to hip thrusts and squats.",
  },
  "هیپ اداکشن دستگاه": {
    name: "Hip Adduction Machine",
    muscleGroup: "Inner thighs",
    howTo: [
      "Sit on the machine with the pads on the outside of your thighs.",
      "Bring your thighs together.",
      "Open back up under control.",
    ],
    benefits: "Isolates the inner thigh muscles, which also helps knee stability.",
  },
  "هیپ ابداکشن دستگاه": {
    name: "Hip Abduction Machine",
    muscleGroup: "Glutes (gluteus medius)",
    howTo: [
      "Sit on the machine with the pads on the inside of your thighs.",
      "Push your thighs apart.",
      "Close back under control.",
    ],
    benefits: "Strengthens the gluteus medius and pelvic stability during running and walking.",
  },
  "پرس پا تک‌پا": {
    name: "Single-Leg Leg Press",
    muscleGroup: "Quadriceps, Glutes",
    howTo: [
      "On the leg press machine, place only one leg on the platform.",
      "Bend your knee to about 90 degrees.",
      "Push through your heel to move the platform away.",
    ],
    benefits: "Corrects strength imbalances between the two legs.",
  },
  "ساق پا خم": {
    name: "Bent-Knee Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "Lean your torso forward or sit on a dedicated machine.",
      "Raise your heels as high as possible by lifting your toes.",
      "Lower slowly to a full stretch.",
    ],
    benefits: "With the knee bent, it puts more emphasis on the soleus (under the calf).",
  },
  "ساق پا با دستگاه پرس پا": {
    name: "Leg Press Calf Raise",
    muscleGroup: "Calves",
    howTo: [
      "On the leg press machine, place only your toes on the edge of the platform.",
      "Push through your toes to move the platform away.",
      "Return under control to a full stretch.",
    ],
    benefits: "Heavy calf loading with a safe, fixed path.",
  },
  "پرس سینه دستگاه": {
    name: "Machine Chest Press",
    muscleGroup: "Chest, Shoulders, Triceps",
    howTo: [
      "Sit on the machine and grip the handles at chest height.",
      "Press forward until your elbows are fully extended.",
      "Return under control.",
    ],
    benefits: "The machine's fixed path lets you focus on pressing without worrying about balancing the weight.",
  },
  "پک دک (فلای دستگاه)": {
    name: "Pec Deck",
    muscleGroup: "Chest",
    howTo: [
      "Sit on the machine with your forearms on the pads.",
      "Contract your chest to bring the pads together in front of your body.",
      "Open back up under control.",
    ],
    benefits: "Full isolation of the chest on a fixed, safe path, good for beginners.",
  },
  "پرس سینه شیب‌دار دستگاه": {
    name: "Incline Machine Press",
    muscleGroup: "Upper chest, Shoulders",
    howTo: [
      "Sit on the incline machine and grip the handles at upper-chest height.",
      "Press forward and up.",
      "Return under control.",
    ],
    benefits: "Safe loading of the upper chest, suitable for warm-ups or volume training.",
  },
  "فلای دمبل شیب‌دار": {
    name: "Incline Dumbbell Fly",
    muscleGroup: "Upper chest",
    howTo: [
      "Lie on an incline bench with the dumbbells above your chest.",
      "Open your arms out to the sides until you feel a stretch in the upper chest.",
      "Bring them back up by contracting your chest.",
    ],
    benefits: "Shapes the upper part of the chest with a deeper stretch than a flat fly.",
  },
  "کراس‌اور سیم‌کش": {
    name: "Cable Crossover",
    muscleGroup: "Chest",
    howTo: [
      "Stand between two cable pulleys and grip the handles from above.",
      "With a slight elbow bend, bring your hands down and together in front of your body.",
      "Return under control.",
    ],
    benefits: "Constant cable tension through the full range of motion, excellent for separation and the final shape of the chest.",
  },
  "زیربغل دستگاه نشسته": {
    name: "Seated Machine Row",
    muscleGroup: "Back, Lats",
    howTo: [
      "Sit on the machine with your chest against the pad.",
      "Pull the handles toward your body, squeezing your shoulder blades together.",
      "Return forward under control.",
    ],
    benefits: "With your chest supported, stress on the lower back is removed and the focus stays fully on the back.",
  },
  "پول‌داون نزدیک": {
    name: "Close Grip Pulldown",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Grip the V-handle or a close-grip attachment.",
      "Pull it toward your upper chest.",
      "Return up under control.",
    ],
    benefits: "The close grip puts more emphasis on lower back thickness and the biceps.",
  },
  "زیربغل معکوس سیمکش": {
    name: "Reverse-Grip Cable Row",
    muscleGroup: "Back, Lats, Biceps",
    howTo: [
      "Grip the straight bar with your palms facing up.",
      "Pull toward your stomach, keeping your elbows close to your body.",
      "Return under control.",
    ],
    benefits: "The reverse grip engages the biceps more and builds back thickness better.",
  },
  "رک پول": {
    name: "Rack Pull",
    muscleGroup: "Hamstrings, Glutes, Lower back",
    howTo: [
      "Set the barbell on the rack pins at about knee height.",
      "With a flat back, lift the barbell from the rack until you stand up straight.",
      "Lower it back onto the rack under control.",
    ],
    benefits: "A short-range version of the deadlift that allows heavier loading with less risk.",
  },
  "پرس سرشانه دستگاه": {
    name: "Machine Shoulder Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Sit on the machine and grip the handles above your shoulders.",
      "Press up until your elbows are straight.",
      "Return under control.",
    ],
    benefits: "The machine's fixed path makes for safe shoulder training without balance concerns.",
  },
  "پرس سرشانه اسمیت": {
    name: "Smith Machine Shoulder Press",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Sit on a bench under the Smith machine with the bar above your shoulders.",
      "Press overhead.",
      "Return under control.",
    ],
    benefits: "Heavy loading on a fixed path, without needing a spotter.",
  },
  "نشر جانبی دستگاه": {
    name: "Machine Lateral Raise",
    muscleGroup: "Side deltoids",
    howTo: [
      "Sit on the machine with your arms under the pads.",
      "With a slight elbow bend, raise your arms up to shoulder height.",
      "Lower under control.",
    ],
    benefits: "Constant resistance and a controlled path for isolating the side deltoids.",
  },
  "نشر خم به جلو سیم‌کش": {
    name: "Cable Front Raise",
    muscleGroup: "Front deltoids",
    howTo: [
      "Grip the low cable handle with one hand.",
      "With a straight elbow, raise your arm forward to shoulder height.",
      "Lower under control.",
    ],
    benefits: "Constant cable resistance keeps pressure on the front deltoid through the full range of motion.",
  },
  "آپ‌رایت رو": {
    name: "Upright Row",
    muscleGroup: "Shoulders, Traps",
    howTo: [
      "Hold the barbell or band in front of your thighs.",
      "Raise the elbows and pull the weight up close to your chin.",
      "Lower under control.",
    ],
    benefits: "Works the shoulders and upper traps at the same time.",
  },
  "پرس لندماین": {
    name: "Landmine Press",
    muscleGroup: "Shoulders, Chest, Core",
    howTo: [
      "Anchor one end of the barbell in a landmine or a fixed corner.",
      "Hold the other end at shoulder height with one or two hands and press up and forward.",
      "Return under control.",
    ],
    benefits: "The angled press path puts less stress on the shoulder, a good option for shoulder limitations.",
  },
  "جلوبازو کانسنتریشن": {
    name: "Concentration Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Sit down and rest your elbow against the inside of the same-side thigh.",
      "Curl the dumbbell up by bending your elbow.",
      "Lower under control.",
    ],
    benefits: "Full isolation of the biceps without help from the rest of the body, good for shaping the peak.",
  },
  "جلوبازو روی نیمکت شیب‌دار": {
    name: "Incline Dumbbell Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Lie back on an incline bench with your arms hanging down.",
      "Curl the dumbbell up by bending your elbows.",
      "Lower under control.",
    ],
    benefits: "Puts more stretch on the biceps at the start of the movement than the standing version.",
  },
  "جلوبازو دستگاه": {
    name: "Machine Bicep Curl",
    muscleGroup: "Biceps",
    howTo: [
      "Sit on the machine with your arms resting on the pad.",
      "Curl the weight up by bending your elbows.",
      "Lower under control.",
    ],
    benefits: "A fixed, isolated path that needs no balance control.",
  },
  "پشت بازو دستگاه": {
    name: "Machine Triceps Extension",
    muscleGroup: "Triceps",
    howTo: [
      "Sit on the machine with your arms resting on the pad.",
      "Straighten your elbows to push the weight down or forward.",
      "Return under control.",
    ],
    benefits: "Safe triceps isolation on a fixed path.",
  },
  "پشت بازو دیپ روی دستگاه": {
    name: "Assisted Dip",
    muscleGroup: "Triceps, Lower chest",
    howTo: [
      "Sit on the assisted dip machine and grip the handles.",
      "Press the handles to push your body up, then lower under control.",
      "Return to the start under control.",
    ],
    benefits: "An assisted version of the dip, for when bodyweight is still too challenging.",
  },
  "کیک‌بک پشت بازو": {
    name: "Dumbbell Kickback",
    muscleGroup: "Triceps",
    howTo: [
      "Bend your torso forward with your elbow at 90 degrees close to your body.",
      "Straighten your elbow and push the dumbbell backward.",
      "Return under control.",
    ],
    benefits: "Isolates the outer head of the triceps with a good stretch at the end of the movement.",
  },
  "مچ دست معکوس": {
    name: "Reverse Wrist Curl",
    muscleGroup: "Forearms",
    howTo: [
      "Rest your forearms on your knees or a bench and hold the barbell palms down.",
      "Raise the barbell using only your wrists.",
      "Lower under control.",
    ],
    benefits: "Strengthens the wrist extensor muscles. Balance with the wrist flexors matters.",
  },
  "فارمر واک": {
    name: "Farmer's Walk",
    muscleGroup: "Forearms, Core, Full body",
    howTo: [
      "Hold a heavy dumbbell or kettlebell in each hand.",
      "Walk the target distance with a straight torso and shoulders back.",
      "Set the weights down under control.",
    ],
    benefits: "Simultaneously builds grip strength, core stability and full-body endurance.",
  },
  "کوهنورد": {
    name: "Mountain Climber",
    muscleGroup: "Core, Cardio",
    howTo: [
      "Get into a plank position.",
      "Drive your knees toward your chest alternately and quickly.",
      "Keep your hips down and maintain the rhythm.",
    ],
    benefits: "Trains the core while keeping the heart rate high.",
  },
  "کوهنورد آهسته": {
    name: "Slow Mountain Climber",
    muscleGroup: "Core",
    howTo: [
      "Get into a plank position.",
      "Draw your knees slowly and under control toward your chest.",
      "Keep your hips still and your abs tight.",
    ],
    benefits: "A low-impact version of the mountain climber, suitable for physical limitations or warm-ups.",
  },
  "چرخ شکم": {
    name: "Ab Wheel Rollout",
    muscleGroup: "Core (abs, lower back)",
    howTo: [
      "Kneel and hold the ab wheel in front of you.",
      "With full control, roll the wheel forward until your body is stretched out.",
      "Contract your abs to return to the start.",
    ],
    benefits: "One of the hardest and most effective movements for full core strength.",
  },
  "دد باگ": {
    name: "Dead Bug",
    muscleGroup: "Core (spinal stability)",
    howTo: [
      "Lie on your back with your arms above your chest and your knees at 90 degrees.",
      "Straighten one arm and the opposite leg at the same time, keeping your lower back flat.",
      "Return under control and repeat on the other side.",
    ],
    benefits: "Trains spinal stability without putting pressure on the lower back. Excellent for injury prevention.",
  },
  "بردباره": {
    name: "Plank Shoulder Tap",
    muscleGroup: "Core, Full body",
    howTo: [
      "Get into a plank position on your hands.",
      "Place one hand on the opposite shoulder and return it, without rotating your hips.",
      "Repeat on the other side.",
    ],
    benefits: "Strengthens shoulder stability and the anti-rotation of the core at the same time.",
  },
  "قایقی (روئینگ) دستگاه": {
    name: "Rowing Machine",
    muscleGroup: "Cardio, Back, Legs",
    howTo: [
      "Secure your feet in the straps and grab the handle.",
      "Push with your legs and pull the handle toward your stomach to row.",
      "Return to the start under control.",
    ],
    benefits: "Full-body cardio with low stress on the joints.",
  },
  "الپتیکال": {
    name: "Elliptical",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Stand on the machine and place your hands on the handles.",
      "Set the resistance.",
      "Pedal at the target intensity, with your arms moving at the same time.",
    ],
    benefits: "Impact-free cardio, suitable for people with joint limitations.",
  },
  "پله‌نوردی": {
    name: "Stair Climber",
    muscleGroup: "Cardio, Quadriceps, Glutes",
    howTo: [
      "Stand on the stair climber or on real stairs.",
      "Climb at a steady rhythm with your whole foot on each step.",
      "Don't lean on the handles and keep your torso straight.",
    ],
    benefits: "Builds cardio and lower-body strength at the same time.",
  },
  "شنا (استخر)": {
    name: "Swimming",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Swim slowly for a few minutes to warm up.",
      "Swim at the target intensity in your chosen stroke (freestyle, breaststroke, etc.).",
      "Keep your breathing regular and rest between lengths if needed.",
    ],
    benefits: "Low-impact cardio that works nearly all the muscles of the body.",
  },
  "طناب‌زنی سنگین (بتل‌روپ)": {
    name: "Battle Ropes",
    muscleGroup: "Cardio, Shoulders, Core",
    howTo: [
      "Hold both ends of the heavy rope, with your knees slightly bent and your core tight.",
      "Make the rope wave by alternating your arm movements.",
      "Work in short intervals and rest between them.",
    ],
    benefits: "High-intensity cardio that works the upper body and the core.",
  },
  "کتل‌بل سوئینگ": {
    name: "Kettlebell Swing",
    muscleGroup: "Glutes, Hamstrings, Cardio",
    howTo: [
      "Hold the kettlebell in both hands in front of your body, feet shoulder-width apart.",
      "Hinge at the hips (not a squat) and swing the kettlebell between your legs.",
      "Drive your glutes explosively to raise the kettlebell to shoulder height.",
    ],
    benefits: "Combines posterior-chain strength and cardio in one explosive movement.",
  },
  "جامپینگ جک": {
    name: "Jumping Jacks",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Stand with your feet together and your arms by your sides.",
      "Jump your feet apart while raising your arms overhead.",
      "Jump back to the start position.",
    ],
    benefits: "A quick warm-up or light cardio, with no equipment needed.",
  },
  "های‌نیز": {
    name: "High Knees",
    muscleGroup: "Cardio, Quadriceps",
    howTo: [
      "Stand tall.",
      "Run in place at high speed, lifting your knees up to hip height.",
      "Land on the balls of your feet and swing your arms in rhythm.",
    ],
    benefits: "Quickly raises your heart rate and improves running coordination.",
  },
  "کشش همسترینگ نشسته": {
    name: "Seated Hamstring Stretch",
    muscleGroup: "Flexibility (hamstrings)",
    howTo: [
      "Sit with one leg straight out in front and the other bent.",
      "Keeping your back straight, hinge toward the toes of the straight leg.",
      "Hold for 20-30 seconds.",
    ],
    benefits: "Improves hamstring flexibility, which helps with deeper hinges and squats.",
  },
  "کشش چهارسر ایستاده": {
    name: "Standing Quad Stretch",
    muscleGroup: "Flexibility (quadriceps)",
    howTo: [
      "Stand on one leg, hold the other ankle and pull it toward your glutes.",
      "Keep your knees together.",
      "Hold for 20-30 seconds, then switch sides.",
    ],
    benefits: "Opens the front of the thigh, which is useful after squats or running.",
  },
  "کبوتر (یوگا)": {
    name: "Pigeon Pose",
    muscleGroup: "Flexibility (glutes, hips)",
    howTo: [
      "Bring one knee forward and angled, and extend the other leg straight back.",
      "Lower your torso over the front knee.",
      "Hold for 30 seconds, then switch sides.",
    ],
    benefits: "Deep hip opening that improves squats and lunges and may help reduce lower back pain.",
  },
  "کشش سرشانه پشت بدن": {
    name: "Cross Body Shoulder Stretch",
    muscleGroup: "Flexibility (shoulders)",
    howTo: [
      "Pull one arm across your body toward the opposite shoulder.",
      "Hold the elbow with your other hand and apply gentle pressure.",
      "Hold for 20-30 seconds, then switch sides.",
    ],
    benefits: "Maintains shoulder range of motion, useful before and after upper-body training.",
  },
  "فوم رولینگ": {
    name: "Foam Rolling",
    muscleGroup: "Recovery, Flexibility",
    howTo: [
      "Place the foam roller under the target muscle.",
      "Using your body weight, slowly roll forward and back over the foam.",
      "Pause briefly on tight spots.",
    ],
    benefits: "Improves blood flow and muscle recovery, and reduces post-workout tightness.",
  },
  "پرس سینه دست جمع": {
    name: "Close Grip Bench Press",
    muscleGroup: "Triceps, Chest",
    howTo: [
      "Lie flat on a bench and grip the barbell slightly wider than shoulder-width.",
      "Lower it under control to near your chest, keeping your elbows close to your body.",
      "Press back up by driving through your triceps.",
    ],
    benefits: "With a close grip, the load shifts from the chest to the triceps. One of the best compound movements for triceps strength.",
  },
  "پرس سینه دکلاین": {
    name: "Decline Bench Press",
    muscleGroup: "Lower chest, Triceps",
    howTo: [
      "Lie on a decline bench (head lower than feet) with the barbell or dumbbells above your chest.",
      "Lower under control to your lower chest.",
      "Press back up.",
    ],
    benefits: "Focuses more on the lower part of the chest, which is less engaged in a flat or incline press.",
  },
  "اسکوات تک‌پا": {
    name: "Single-Leg Squat",
    muscleGroup: "Quadriceps, Glutes, Balance",
    howTo: [
      "Stand on one leg with the other leg extended straight in front of you.",
      "With full control, lower yourself as far as possible on that same leg.",
      "Push through your heel to stand, without losing your balance.",
    ],
    benefits: "Trains strength, balance and single-leg control at a high level. An advanced version of the squat.",
  },
  "پروانه معکوس دمبل": {
    name: "Reverse Dumbbell Fly",
    muscleGroup: "Rear deltoids, Upper back",
    howTo: [
      "Hinge your torso forward from the hips, with a dumbbell hanging in each hand.",
      "With a slight elbow bend, raise your arms out to the sides until your shoulder blades come together.",
      "Lower under control.",
    ],
    benefits: "The most isolated exercise for the rear deltoid, important for shoulder symmetry and better posture.",
  },
  "پروانه معکوس دستگاه": {
    name: "Reverse Pec Deck",
    muscleGroup: "Rear deltoids, Upper back",
    howTo: [
      "Sit on the pec deck machine facing the backrest, holding the handles in front of your body.",
      "Pull your elbows outward to open your arms out to the sides.",
      "Return forward under control.",
    ],
    benefits: "A fixed path that focuses on the rear deltoid without balance concerns.",
  },
  "دراز و نشست": {
    name: "Sit Up",
    muscleGroup: "Abs",
    howTo: [
      "Lie on your back with your knees bent and your feet flat on the floor.",
      "Contract your abs to raise your whole torso until you reach close to your knees.",
      "Lower under control.",
    ],
    benefits: "A classic bodyweight movement with a fuller range of motion than the crunch.",
  },
  "بالا آوردن پا خوابیده": {
    name: "Lying Leg Raise",
    muscleGroup: "Lower abs",
    howTo: [
      "Lie on your back with your hands by your sides or under your hips.",
      "With your legs straight, raise both legs until they are vertical.",
      "Lower under control without letting your heels touch the floor.",
    ],
    benefits: "Works the lower abs through a full range of motion, with no equipment needed.",
  },
  "کرانچ معکوس": {
    name: "Reverse Crunch",
    muscleGroup: "Lower abs",
    howTo: [
      "Lie on your back with your knees bent and above your hips.",
      "Contract your abs to lift your hips off the floor and bring your knees toward your chest.",
      "Lower under control.",
    ],
    benefits: "Unlike a regular crunch, which lifts the shoulders, here the hips move, focusing more on the lower abs.",
  },
};
