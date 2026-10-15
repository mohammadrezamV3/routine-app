import type { ExerciseEn } from "./types";

// ترجمه‌ی ../power.ts — کلید = name فارسی
export const POWER_EN: Record<string, ExerciseEn> = {
  "پاور کلین": {
    name: "Power Clean",
    muscleGroup: "Full Body, Posterior Chain, Traps",
    howTo: [
      "Grip the barbell on the floor as in a deadlift, with a straight back.",
      "Pull the barbell up to the top of your thighs, then explosively extend your hips and shrug.",
      "Get under the bar and catch it at the front of your shoulders with your knees slightly bent.",
    ],
    benefits: "Full body explosive power, the foundation of athletic preparation.",
  },
  "هنگ کلین": {
    name: "Hang Clean",
    muscleGroup: "Full Body, Glutes, Traps",
    howTo: [
      "Hold the barbell in front of your thighs and lower it to just above your knees.",
      "Explosively extend your hips and shrug.",
      "Catch the barbell in front of your shoulders.",
    ],
    benefits: "An easier way to learn the clean without starting from the floor.",
  },
  "کلین اسکوات": {
    name: "Squat Clean",
    muscleGroup: "Full Body, Quads",
    howTo: [
      "Lift the barbell as in the power clean.",
      "Get all the way down into a squat under the bar and catch it at the front of your shoulders.",
      "Stand up from the bottom of the squat.",
    ],
    benefits: "The full Olympic lift for the heaviest loads.",
  },
  "پاور اسنچ": {
    name: "Power Snatch",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Grip the barbell from the floor with a very wide grip.",
      "Pull explosively with your hips and send the barbell overhead.",
      "Catch it with straight arms and a slightly bent knee.",
    ],
    benefits: "The fastest and most explosive barbell movement.",
  },
  "هنگ اسنچ": {
    name: "Hang Snatch",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Hold the barbell in front of your thighs with a wide grip.",
      "Lower to just above your knees, then pull explosively upward.",
      "Catch it overhead.",
    ],
    benefits: "Snatch technique from the hang position.",
  },
  "اسپلیت جرک": {
    name: "Split Jerk",
    muscleGroup: "Shoulders, Legs",
    howTo: [
      "Hold the barbell in front of your shoulders with a slight knee bend.",
      "Drive the barbell up explosively and split your legs into a lunge.",
      "Lock out, then bring your feet back together.",
    ],
    benefits: "Allows you to lift the heaviest weight overhead.",
  },
  "پوش جرک": {
    name: "Push Jerk",
    muscleGroup: "Shoulders, Legs",
    howTo: [
      "Hold the barbell in front of your shoulders with a slight knee bend.",
      "Drive the barbell up explosively and get under it with bent knees.",
      "Stand up and lock it out.",
    ],
    benefits: "Overhead power for athletes.",
  },
  "کلین پول": {
    name: "Clean Pull",
    muscleGroup: "Posterior Chain, Traps",
    howTo: [
      "Lift the barbell from the floor as in a clean.",
      "Explosively extend your hips and shrug.",
      "Lower the barbell in front of your shoulders without catching it.",
    ],
    benefits: "Builds clean pulling strength without the complexity of the catch.",
  },
  "های پول": {
    name: "High Pull",
    muscleGroup: "Traps, Shoulders, Glutes",
    howTo: [
      "Hold the barbell in front of your thighs.",
      "Explosively extend your hips and pull the barbell up to your chest with elbows high and wide.",
      "Lower under control.",
    ],
    benefits: "Pulling power and trap strength.",
  },
  "پاور کلین دمبل": {
    name: "Dumbbell Power Clean",
    muscleGroup: "Full Body",
    howTo: [
      "Hold the dumbbells beside your knees.",
      "Explosively extend your hips and catch the dumbbells at the shoulders.",
      "Lower and repeat.",
    ],
    benefits: "Full body power that is easier to learn than with a barbell.",
  },
  "اسنچ دمبل تک‌دست": {
    name: "Dumbbell Snatch",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Hold one dumbbell between your legs with one hand.",
      "Use an explosive hip drive to move the dumbbell overhead in one motion.",
      "Lower it and switch hands.",
    ],
    benefits: "A popular CrossFit movement for power and conditioning.",
  },
  "تراستر": {
    name: "Thruster",
    muscleGroup: "Full Body",
    howTo: [
      "Hold a barbell or dumbbells at your shoulders.",
      "Perform a full squat.",
      "Use the drive from standing up to press the weight overhead.",
    ],
    benefits: "Combines a squat and a press in one movement for very high metabolic demand.",
  },
  "تراستر دمبل": {
    name: "Dumbbell Thruster",
    muscleGroup: "Full Body",
    howTo: [
      "Hold the dumbbells at your shoulders.",
      "Squat down and press as you stand up.",
      "Return the dumbbells to your shoulders.",
    ],
    benefits: "Full body training with dumbbells.",
  },
  "دمبل کلین و پرس": {
    name: "Dumbbell Clean and Press",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Clean the dumbbells from beside your knees to your shoulders.",
      "Press them overhead.",
      "Lower and repeat.",
    ],
    benefits: "Full body strength and endurance in one movement.",
  },
  "دویل پرس": {
    name: "Devil Press",
    muscleGroup: "Full Body, Cardio",
    howTo: [
      "Perform a burpee with two dumbbells.",
      "Use hip momentum to swing the dumbbells from the floor overhead.",
      "Lower and repeat.",
    ],
    benefits: "One of the most demanding metabolic exercises in CrossFit.",
  },
  "من میکر": {
    name: "Man Maker",
    muscleGroup: "Full Body",
    howTo: [
      "Do a push-up on two dumbbells.",
      "Row each dumbbell to your side.",
      "Jump, clean the dumbbells and press them overhead.",
    ],
    benefits: "A combination of full strength and cardio.",
  },
  "کتل‌بل کلین": {
    name: "Kettlebell Clean",
    muscleGroup: "Glutes, Forearms, Full Body",
    howTo: [
      "Swing the kettlebell between your legs.",
      "As your hips open, bring the kettlebell close to your body into the rack position at the shoulder.",
      "Lower it gently onto your forearm and return it.",
    ],
    benefits: "Transfers hip power into the upper body.",
  },
  "کتل‌بل اسنچ": {
    name: "Kettlebell Snatch",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Swing the kettlebell between your legs.",
      "Use an explosive hip drive to lock it overhead in one motion.",
      "Lower it and repeat.",
    ],
    benefits: "Endurance and power at the highest level of kettlebell training.",
  },
  "کتل‌بل ترکیش گت آپ": {
    name: "Turkish Get Up",
    muscleGroup: "Full Body, Shoulder Stability",
    howTo: [
      "Lie on your back and hold a kettlebell straight up in one hand.",
      "Move step by step through the elbow, hand, knee, and finally stand up, keeping the kettlebell overhead.",
      "Reverse the same path back down.",
    ],
    benefits: "Shoulder stability, mobility, and full body coordination.",
  },
  "کتل‌بل ویندمیل": {
    name: "Kettlebell Windmill",
    muscleGroup: "Obliques, Shoulder Stability",
    howTo: [
      "Lock a kettlebell overhead with your feet turned slightly.",
      "Send your hips toward the hand holding the weight and slide your other hand down your leg.",
      "Return slowly.",
    ],
    benefits: "Flexibility, obliques, and shoulder stability together.",
  },
  "کتل‌بل هالو": {
    name: "Kettlebell Halo",
    muscleGroup: "Shoulders, Mobility",
    howTo: [
      "Hold the kettlebell upside down by the horns in front of your face.",
      "Slowly circle it around your head.",
      "Change direction.",
    ],
    benefits: "Warms up and improves shoulder mobility.",
  },
  "کتل‌بل سوئینگ آمریکایی": {
    name: "American Kettlebell Swing",
    muscleGroup: "Glutes, Hamstrings, Shoulders",
    howTo: [
      "Swing the kettlebell as in a regular swing.",
      "Continue the swing overhead.",
      "Bring it back down between your legs under control.",
    ],
    benefits: "A greater range of motion than the Russian swing, only for those with healthy shoulders.",
  },
  "های پول کتل‌بل": {
    name: "Kettlebell High Pull",
    muscleGroup: "Traps, Glutes",
    howTo: [
      "Swing the kettlebell between your legs.",
      "Use an explosive hip drive to pull the kettlebell up to your chest, elbow high.",
      "Return to the swing position.",
    ],
    benefits: "Pulling power and conditioning.",
  },
  "کتل‌بل دوبل کلین و پرس": {
    name: "Double Kettlebell Clean and Press",
    muscleGroup: "Full Body, Shoulders",
    howTo: [
      "Clean two kettlebells together.",
      "Press them overhead.",
      "Return to the rack and then between your legs.",
    ],
    benefits: "Advanced kettlebell strength and endurance.",
  },
  "کتل‌بل دور کمر": {
    name: "Kettlebell Around the World",
    muscleGroup: "Core, Forearms",
    howTo: [
      "Hold the kettlebell in front of your body.",
      "Pass it around your waist from one hand to the other.",
      "Change direction.",
    ],
    benefits: "Warms up the grip and stabilizes the torso.",
  },
  "کتل‌بل فیگور هشت": {
    name: "Kettlebell Figure 8",
    muscleGroup: "Core, Glutes",
    howTo: [
      "Stand in a half squat.",
      "Pass the kettlebell between your legs in a figure-eight pattern from one hand to the other.",
      "Keep a steady rhythm.",
    ],
    benefits: "Coordination and hinge endurance.",
  },
  "توپ مدیسن کوبیدن": {
    name: "Medicine Ball Slam",
    muscleGroup: "Full Body, Abs",
    howTo: [
      "Raise the medicine ball overhead.",
      "Slam it into the floor with full force.",
      "Pick the ball up and repeat.",
    ],
    benefits: "Power and stress release, with intense cardio.",
  },
  "پرتاب توپ مدیسن به دیوار": {
    name: "Wall Ball",
    muscleGroup: "Full Body, Cardio",
    howTo: [
      "Hold the ball at your chest and squat down.",
      "As you stand up, throw the ball at the target on the wall.",
      "Catch it and repeat.",
    ],
    benefits: "A classic CrossFit movement for legs and endurance.",
  },
  "پرتاب چرخشی توپ مدیسن": {
    name: "Medicine Ball Rotational Throw",
    muscleGroup: "Obliques, Power",
    howTo: [
      "Stand sideways to a wall and hold the ball beside your hip.",
      "Rotate your hips and torso explosively and throw the ball at the wall.",
      "Catch it and repeat, then switch sides.",
    ],
    benefits: "Rotational power for striking and throwing sports.",
  },
  "پرتاب سینه‌ای توپ مدیسن": {
    name: "Medicine Ball Chest Pass",
    muscleGroup: "Chest, Power",
    howTo: [
      "Stand facing a wall and hold the ball at your chest.",
      "Throw the ball explosively at the wall.",
      "Catch it and repeat.",
    ],
    benefits: "Pressing power for contact sports.",
  },
  "پرتاب توپ مدیسن بالای سر": {
    name: "Overhead Medicine Ball Throw",
    muscleGroup: "Full Body, Power",
    howTo: [
      "Lower the ball between your legs.",
      "Open your hips explosively and throw the ball overhead behind you.",
      "Pick the ball up and repeat.",
    ],
    benefits: "Vertical power and the posterior chain.",
  },
  "برگرداندن لاستیک": {
    name: "Tire Flip",
    muscleGroup: "Full Body",
    howTo: [
      "Sit down at the bottom of a tire and place your fingers under it.",
      "Use your legs and hips to lift the tire up.",
      "Push it with your knee or hands so it flips over.",
    ],
    benefits: "Functional strength in the style of strongman training.",
  },
  "حمل کیسه‌ی شنی": {
    name: "Sandbag Carry",
    muscleGroup: "Full Body, Core",
    howTo: [
      "Lift the sandbag from the floor and hug it against your chest.",
      "Walk with firm steps.",
      "Set it down under control.",
    ],
    benefits: "Functional strength and core stability under an unstable load.",
  },
  "کلین کیسه‌ی شنی": {
    name: "Sandbag Clean",
    muscleGroup: "Full Body",
    howTo: [
      "Grab the sandbag between your legs.",
      "Use an explosive hip drive to lift it and catch it on your shoulder or chest.",
      "Put it down and repeat.",
    ],
    benefits: "Functional power with an unstable load.",
  },
  "راه رفتن یوک": {
    name: "Yoke Walk",
    muscleGroup: "Full Body, Core",
    howTo: [
      "Get under the yoke and lift it.",
      "Walk with short, quick steps.",
      "Set it down under control.",
    ],
    benefits: "Heavy carrying for torso stability and full body strength.",
  },
  "کوبیدن پتک روی لاستیک": {
    name: "Sledgehammer Strike",
    muscleGroup: "Obliques, Shoulders, Cardio",
    howTo: [
      "Stand in front of a tire and hold the sledgehammer.",
      "Raise the hammer above your shoulder and strike the tire with a rotation.",
      "Switch hands.",
    ],
    benefits: "Rotational power and endurance.",
  },
  "فرانت لور": {
    name: "Front Lever",
    muscleGroup: "Lats, Abs",
    howTo: [
      "Hang from a bar.",
      "Raise your body to horizontal with straight arms.",
      "Hold for the set time; start with the tuck version.",
    ],
    benefits: "Advanced pulling and core strength.",
  },
  "بک لور": {
    name: "Back Lever",
    muscleGroup: "Lats, Chest, Shoulders",
    howTo: [
      "Invert on a bar or rings.",
      "Lower your body behind your hands until horizontal.",
      "Hold for the set time.",
    ],
    benefits: "Advanced static strength and shoulder flexibility.",
  },
  "پلانچ لین": {
    name: "Planche Lean",
    muscleGroup: "Shoulders, Abs",
    howTo: [
      "Get into a push-up position and turn your fingers slightly toward your feet.",
      "Move your shoulders ahead of your hands.",
      "Hold while keeping your body straight.",
    ],
    benefits: "The foundation for the planche and front shoulder strength.",
  },
  "ایستادن روی دست": {
    name: "Freestanding Handstand",
    muscleGroup: "Shoulders, Balance",
    howTo: [
      "Place your hands on the floor and swing one leg up.",
      "Keep your body straight and balance with your fingers.",
      "Come out of the handstand with a controlled step down.",
    ],
    benefits: "High-level balance and body control.",
  },
  "پرچم انسانی": {
    name: "Human Flag",
    muscleGroup: "Obliques, Lats, Shoulders",
    howTo: [
      "Grip a vertical pole with your hands apart.",
      "Use the pull of the top arm and the push of the bottom arm to raise your body horizontal.",
      "Hold.",
    ],
    benefits: "One of the most impressive strength movements in calisthenics.",
  },
  "دیپ کره‌ای": {
    name: "Korean Dip",
    muscleGroup: "Shoulders, Triceps",
    howTo: [
      "Stand with your back to the bar and grip it behind your body.",
      "Lower your body and move forward.",
      "Push back up.",
    ],
    benefits: "Shoulder mobility and strength in the back range of motion.",
  },
  "اسکین د کت": {
    name: "Skin the Cat",
    muscleGroup: "Shoulders, Core",
    howTo: [
      "Hang from a bar or rings.",
      "Raise your legs and rotate backward between your arms.",
      "Return slowly.",
    ],
    benefits: "Shoulder mobility and body control.",
  },
  "شنا تایگر بند": {
    name: "Tiger Bend Push Up",
    muscleGroup: "Triceps, Shoulders",
    howTo: [
      "Get into a push-up position on your forearms.",
      "Push with your palms until your arms are straight.",
      "Lower back onto your forearms slowly.",
    ],
    benefits: "Advanced triceps strength in calisthenics.",
  },
  "واک‌اوت با شنا": {
    name: "Push Up Walkout",
    muscleGroup: "Full Body",
    howTo: [
      "Stand up and place your hands on the floor.",
      "Walk your hands forward into a plank and do a push-up.",
      "Walk back and stand up.",
    ],
    benefits: "A full warm-up or a full body workout.",
  },
  "راه رفتن خرچنگی": {
    name: "Crab Walk",
    muscleGroup: "Triceps, Glutes, Shoulders",
    howTo: [
      "Sit with your hands behind your body and lift your hips.",
      "Walk forward and backward with your hands and feet.",
      "Keep your hips from dropping.",
    ],
    benefits: "Builds back-of-body strength and coordination.",
  },
  "پرش اسکوات با چرخش": {
    name: "180 Jump Squat",
    muscleGroup: "Legs Power, Cardio",
    howTo: [
      "Squat down.",
      "Jump and rotate 180 degrees in the air.",
      "Land softly and rotate the other way.",
    ],
    benefits: "Power, coordination and cardio.",
  },
  "برپی پول آپ": {
    name: "Burpee Pull Up",
    muscleGroup: "Full Body",
    howTo: [
      "Do a burpee under a bar.",
      "Jump up, grab the bar and do a pull-up.",
      "Lower down and repeat.",
    ],
    benefits: "A tough combination of metabolic work and pulling.",
  },
  "اسکوات به پرس دمبل": {
    name: "Dumbbell Squat to Press",
    muscleGroup: "Full Body",
    howTo: [
      "Hold the dumbbells at your shoulders and squat down.",
      "Stand up, then press the dumbbells overhead.",
      "Lower and repeat.",
    ],
    benefits: "Two separate movements in a row, easier than a thruster.",
  },
  "ددلیفت به شراگ": {
    name: "Deadlift to Shrug",
    muscleGroup: "Posterior Chain, Traps",
    howTo: [
      "Lift the barbell as in a deadlift.",
      "Shrug at the top of the movement.",
      "Lower under control.",
    ],
    benefits: "Combines the deadlift and the shrug in one set.",
  },
  "لانج با پرس سرشانه": {
    name: "Lunge to Press",
    muscleGroup: "Legs, Shoulders",
    howTo: [
      "Hold dumbbells at your shoulders and perform a lunge.",
      "Push up and press the dumbbells overhead.",
      "Switch legs.",
    ],
    benefits: "A practical full body exercise with dumbbells.",
  },
  "رومانیایی به زیربغل دمبل": {
    name: "RDL to Row",
    muscleGroup: "Posterior Chain, Back",
    howTo: [
      "Perform a Romanian deadlift with dumbbells.",
      "At the bottom of the movement, row the dumbbells up to your sides.",
      "Stand up and repeat.",
    ],
    benefits: "Posterior chain and back work in one movement.",
  },
  "سوئینگ دمبل": {
    name: "Dumbbell Swing",
    muscleGroup: "Glutes, Hamstrings",
    howTo: [
      "Hold one end of a dumbbell with both hands.",
      "Swing it between your legs and use an explosive hip drive to bring it up to chest height.",
      "Let it return and repeat.",
    ],
    benefits: "A replacement for the kettlebell swing.",
  },
  "کلین و جرک هالتر": {
    name: "Clean and Jerk",
    muscleGroup: "Full Body",
    howTo: [
      "Clean the barbell and catch it at the front of your shoulders.",
      "Stand up and take a breath.",
      "Drive the barbell overhead with a jerk and lock it out.",
    ],
    benefits: "One of the two competitive weightlifting movements.",
  },
  "اسنچ هالتر": {
    name: "Barbell Snatch",
    muscleGroup: "Full Body",
    howTo: [
      "Pull the barbell from the floor with a wide grip.",
      "Use an explosive hip drive to lift it overhead in one motion.",
      "Squat under the bar and then stand up.",
    ],
    benefits: "The most technical movement in Olympic weightlifting.",
  },
  "اسکوات جامپ هالتر": {
    name: "Barbell Jump Squat",
    muscleGroup: "Leg Power",
    howTo: [
      "Hold a light barbell on your back.",
      "Lower halfway down and jump explosively.",
      "Land softly and keep the barbell steady.",
    ],
    benefits: "Leg power with a barbell for athletes.",
  },
  "پرش جعبه نشسته": {
    name: "Seated Box Jump",
    muscleGroup: "Leg Power",
    howTo: [
      "Sit on a bench in front of a box.",
      "Without swinging your arms, get up explosively and jump onto the box.",
      "Step down and repeat.",
    ],
    benefits: "Power that starts from a seated position.",
  },
  "پرش عمودی": {
    name: "Vertical Jump",
    muscleGroup: "Leg Power",
    howTo: [
      "Set your feet hip-width apart.",
      "Use an arm swing and a quick knee bend to jump as high as you can.",
      "Land softly.",
    ],
    benefits: "Jumping and leg explosiveness, the foundation of basketball and volleyball.",
  },
  "پرش لی‌لی تک‌پا": {
    name: "Single-Leg Hop",
    muscleGroup: "Leg Power, Balance",
    howTo: [
      "Stand on one leg.",
      "Hop forward and land softly.",
      "Repeat several times and switch legs.",
    ],
    benefits: "Single-leg power and stability, used in return-to-sport tests.",
  },
  "بوندینگ": {
    name: "Bounding",
    muscleGroup: "Leg Power, Cardio",
    howTo: [
      "Run with very long, bounding strides.",
      "Drive your knee up and swing the opposite arm.",
      "Cover a short distance.",
    ],
    benefits: "Horizontal power and running stride length.",
  },
};
