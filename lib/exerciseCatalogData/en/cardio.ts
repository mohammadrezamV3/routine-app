import type { ExerciseEn } from "./types";

// ترجمه‌ی ../cardio.ts — کلید = name فارسی
export const CARDIO_EN: Record<string, ExerciseEn> = {
  "پیاده‌روی شیب‌دار تردمیل": {
    name: "Incline Treadmill Walk",
    muscleGroup: "Cardio, Glutes, Calves",
    howTo: [
      "Set the treadmill incline to 8 to 15 percent.",
      "Walk at a moderate pace without holding the handrails.",
      "Keep a steady heart rate for 20 to 40 minutes.",
    ],
    benefits: "Burns fat with low joint impact and good glute engagement.",
  },
  "دویدن روی تردمیل": {
    name: "Treadmill Run",
    muscleGroup: "Cardio",
    howTo: [
      "Warm up with 5 minutes of brisk walking.",
      "Run at a pace where you can still talk in short sentences.",
      "Slow down at the end and cool down.",
    ],
    benefits: "Builds cardio endurance with full control of speed and incline.",
  },
  "اسپرینت تردمیل": {
    name: "Treadmill Sprint Intervals",
    muscleGroup: "Cardio, Leg power",
    howTo: [
      "Warm up well.",
      "Sprint at a safe maximum speed for 20 to 30 seconds.",
      "Walk slowly for 60 to 90 seconds and repeat.",
    ],
    benefits: "High-intensity intervals that build aerobic capacity in little time.",
  },
  "اسپرینت": {
    name: "Sprint",
    muscleGroup: "Cardio, Hamstrings, Glutes",
    howTo: [
      "Warm up well and do a few light accelerating strides.",
      "Sprint at maximum speed over 20 to 60 meters.",
      "Rest fully and repeat.",
    ],
    benefits: "Explosive speed and leg power, the strongest stimulus for the hamstrings.",
  },
  "اسپرینت سربالایی": {
    name: "Hill Sprint",
    muscleGroup: "Cardio, Glutes, Calves",
    howTo: [
      "Find a short hill.",
      "Sprint up it at maximum effort.",
      "Walk slowly back down and repeat.",
    ],
    benefits: "Leg power with less hamstring strain than a flat sprint.",
  },
  "دویدن طولانی آهسته": {
    name: "Long Slow Distance Run",
    muscleGroup: "Cardio",
    howTo: [
      "Run at a pace where you can talk comfortably.",
      "Continue for 45 to 90 minutes.",
      "Drink enough water and cool down at the end.",
    ],
    benefits: "The base of aerobic fitness and long-distance endurance.",
  },
  "فارتلک": {
    name: "Fartlek Run",
    muscleGroup: "Cardio",
    howTo: [
      "Start with an easy jog.",
      "Alternate freely between a few minutes fast and a few minutes slow.",
      "Adjust the intervals by how your body feels.",
    ],
    benefits: "Free-form interval training for speed and endurance that is enjoyable.",
  },
  "دوچرخه‌سواری بیرون": {
    name: "Outdoor Cycling",
    muscleGroup: "Cardio, Quads",
    howTo: [
      "Adjust the seat height so your knee is almost straight at the bottom of the pedal stroke.",
      "Pedal at a moderate effort.",
      "Gradually increase your route and time.",
    ],
    benefits: "Low-impact cardio that is easy on the joints and enjoyable outdoors.",
  },
  "دوچرخه ثابت تناوبی": {
    name: "Stationary Bike Intervals",
    muscleGroup: "Cardio, Quads",
    howTo: [
      "Pedal easily for 5 minutes.",
      "Pedal hard at high resistance and speed for 30 seconds, then easy for 90 seconds.",
      "Repeat for 8 to 10 rounds.",
    ],
    benefits: "High-intensity intervals with minimal joint stress.",
  },
  "ایربایک": {
    name: "Air Bike",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Sit on the bike and grip the handles.",
      "Push with your arms and pedal with your legs at the same time.",
      "Continue steadily or in intervals.",
    ],
    benefits: "One of the hardest cardio workouts, using arms and legs together.",
  },
  "اسکی ارگ": {
    name: "Ski Erg",
    muscleGroup: "Cardio, Lats, Triceps",
    howTo: [
      "Stand facing the machine and hold the handles above your head.",
      "Bend at the hips and pull the handles down with your arms.",
      "Return up and keep a steady rhythm.",
    ],
    benefits: "Upper-body focused cardio with low load on the legs.",
  },
  "روئینگ تناوبی": {
    name: "Rowing Intervals",
    muscleGroup: "Cardio, Back, Legs",
    howTo: [
      "Row easily for 5 minutes.",
      "Row 250 to 500 meters hard, then rest easily for 1 to 2 minutes.",
      "Keep the order of legs, body, then arms.",
    ],
    benefits: "Works the whole body in high-intensity intervals with low impact.",
  },
  "پله‌نوردی واقعی": {
    name: "Stair Climbing",
    muscleGroup: "Cardio, Glutes, Quads",
    howTo: [
      "Climb the stairs in a building or stadium.",
      "Keep a steady pace and place your whole foot on each step.",
      "Walk down slowly and repeat.",
    ],
    benefits: "Free cardio that also strengthens the legs and glutes.",
  },
  "کوهپیمایی": {
    name: "Hiking",
    muscleGroup: "Cardio, Legs",
    howTo: [
      "Wear proper shoes and bring water.",
      "Climb at a steady pace with controlled breathing.",
      "Descend with slightly bent knees.",
    ],
    benefits: "Endurance, leg strength and mental well-being in nature.",
  },
  "پیاده‌روی با کوله": {
    name: "Rucking",
    muscleGroup: "Cardio, Legs, Core",
    howTo: [
      "Fill a backpack with 5 to 15 percent of your body weight.",
      "Walk upright with steady steps.",
      "Gradually increase the weight and distance.",
    ],
    benefits: "Low-intensity cardio that strengthens the legs and posture.",
  },
  "طناب زدن دوبل": {
    name: "Double Under",
    muscleGroup: "Cardio, Calves",
    howTo: [
      "Start like a regular jump rope.",
      "Jump a bit higher and spin the rope faster so it passes under your feet twice.",
      "Keep a steady rhythm.",
    ],
    benefits: "Coordination and endurance at an advanced level.",
  },
  "شنا کرال": {
    name: "Freestyle Swimming",
    muscleGroup: "Cardio, Full body, Back",
    howTo: [
      "Move forward with your face in the water, alternating arms.",
      "Kick with short, steady leg strokes.",
      "Breathe every 2 or 3 arm strokes.",
    ],
    benefits: "Full-body cardio with no impact on the joints.",
  },
  "دوی آب": {
    name: "Aqua Jogging",
    muscleGroup: "Cardio",
    howTo: [
      "Stand in deep water or in chest-deep water.",
      "Perform a running motion in the water.",
      "Continue for 20 to 30 minutes.",
    ],
    benefits: "Cardio during recovery or weight gain, with no pressure on the joints.",
  },
  "برپی بدون پرش": {
    name: "Low Impact Burpee",
    muscleGroup: "Full body, Cardio",
    howTo: [
      "Bend down and place your hands on the floor.",
      "Step your legs back one at a time, then bring them back.",
      "Stand up without jumping.",
    ],
    benefits: "A burpee for beginners or sensitive joints.",
  },
  "برپی با شنا": {
    name: "Burpee with Push Up",
    muscleGroup: "Full body, Cardio, Chest",
    howTo: [
      "Bend down and jump your feet back.",
      "Do one full push-up.",
      "Bring your feet forward and jump.",
    ],
    benefits: "The full burpee for endurance and upper-body strength.",
  },
  "برپی پرش جعبه": {
    name: "Burpee Box Jump",
    muscleGroup: "Full body, Cardio, Quads",
    howTo: [
      "Do a burpee in front of a box.",
      "Jump onto the box.",
      "Step down and repeat.",
    ],
    benefits: "A hard combination for metabolic work and power.",
  },
  "اسکیتر": {
    name: "Skater Jump",
    muscleGroup: "Glutes, Balance, Cardio",
    howTo: [
      "Stand on one leg.",
      "Jump sideways onto the other leg.",
      "Land softly and jump back.",
    ],
    benefits: "Lateral power and knee stability.",
  },
  "پرش تاک": {
    name: "Tuck Jump",
    muscleGroup: "Leg power, Cardio, Abs",
    howTo: [
      "Bend slightly and jump high.",
      "Bring your knees toward your chest in the air.",
      "Land softly.",
    ],
    benefits: "Explosive power and coordination.",
  },
  "پرش طول جفت": {
    name: "Broad Jump",
    muscleGroup: "Leg power, Glutes",
    howTo: [
      "Stand with feet hip-width apart and swing your arms back.",
      "Use your arm swing to jump forward as far as possible.",
      "Land softly and balanced.",
    ],
    benefits: "Horizontal leg power for sprinting and sports.",
  },
  "پرش عمق": {
    name: "Depth Jump",
    muscleGroup: "Leg power",
    howTo: [
      "Stand on a low box.",
      "Step off and jump straight up immediately after landing.",
      "Keep ground contact short.",
    ],
    benefits: "Reactivity and advanced vertical jump.",
  },
  "پرش جانبی روی مانع": {
    name: "Lateral Hurdle Hop",
    muscleGroup: "Leg power, Agility",
    howTo: [
      "Stand next to a low hurdle.",
      "Jump sideways over it with both feet.",
      "Turn around quickly.",
    ],
    benefits: "Agility and lateral power.",
  },
  "پرش جعبه تک‌پا": {
    name: "Single-Leg Box Jump",
    muscleGroup: "Leg power",
    howTo: [
      "Stand on one leg in front of a low box.",
      "Jump onto the box with the same leg.",
      "Step down slowly and repeat.",
    ],
    benefits: "Single-leg power for jumping sports.",
  },
  "پرش ستاره": {
    name: "Star Jump",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Bend slightly.",
      "Jump and spread your arms and legs into a star shape.",
      "Land back in a tight position.",
    ],
    benefits: "Explosive cardio with no equipment.",
  },
  "سیل جک": {
    name: "Seal Jack",
    muscleGroup: "Cardio, Shoulders",
    howTo: [
      "Jump like a jumping jack.",
      "Open and close your arms horizontally in front of your chest.",
      "Keep the rhythm fast.",
    ],
    benefits: "A variation of jumping jacks that emphasizes the upper back.",
  },
  "بات کیک": {
    name: "Butt Kicks",
    muscleGroup: "Cardio, Hamstrings",
    howTo: [
      "Run in place.",
      "Kick your heels up to your glutes.",
      "Keep a fast rhythm and a straight body.",
    ],
    benefits: "Dynamic warm-up that raises heart rate.",
  },
  "اسکیپ": {
    name: "A-Skip",
    muscleGroup: "Cardio, Coordination",
    howTo: [
      "Move forward with short skipping steps.",
      "Lift your knee high and land on the ball of your foot under your body.",
      "Swing your arms in rhythm with your legs.",
    ],
    benefits: "Running technique drill and warm-up.",
  },
  "شاتل ران": {
    name: "Shuttle Run",
    muscleGroup: "Cardio, Agility",
    howTo: [
      "Place two cones 5 to 10 meters apart.",
      "Sprint back and forth between the cones and touch the ground each time.",
      "Rest and repeat.",
    ],
    benefits: "Agility, change of direction and speed endurance.",
  },
  "نردبان چابکی": {
    name: "Agility Ladder Drills",
    muscleGroup: "Agility, Calves",
    howTo: [
      "Lay the ladder flat on the ground.",
      "Move quickly in and out of each square with short steps.",
      "Change the patterns and gradually increase speed.",
    ],
    benefits: "Coordination and foot speed for team sports.",
  },
  "شادو باکسینگ": {
    name: "Shadow Boxing",
    muscleGroup: "Cardio, Shoulders, Obliques",
    howTo: [
      "Stand in a guard position.",
      "Throw straight punches, hooks and uppercuts in the air and move around.",
      "Do rounds of 2 to 3 minutes.",
    ],
    benefits: "Cardio, coordination and stress release without equipment.",
  },
  "کیسه‌ی بوکس": {
    name: "Heavy Bag Work",
    muscleGroup: "Cardio, Shoulders, Core",
    howTo: [
      "Wear gloves and stand in a guard in front of the bag.",
      "Combine punches with hip rotation.",
      "Do rounds of 2 to 3 minutes with short rests.",
    ],
    benefits: "Strength, endurance and agility together.",
  },
  "بتل‌روپ موجی متناوب": {
    name: "Alternating Battle Rope Waves",
    muscleGroup: "Cardio, Shoulders, Forearms",
    howTo: [
      "Hold the ends of the ropes and sit into a half squat.",
      "Move your arms up and down quickly, alternating sides.",
      "Work for 20 to 30 seconds, then rest.",
    ],
    benefits: "Intense upper-body cardio with low load on the legs.",
  },
  "بتل‌روپ کوبشی": {
    name: "Battle Rope Slam",
    muscleGroup: "Cardio, Full body, Shoulders",
    howTo: [
      "Raise the ropes above your head.",
      "Slam them down to the floor with full force.",
      "Repeat quickly.",
    ],
    benefits: "Power and high heart rate in a short time.",
  },
  "سورتمه هل دادن": {
    name: "Sled Push",
    muscleGroup: "Cardio, Quads, Glutes",
    howTo: [
      "Grip the sled handles and lean your body at about 45 degrees.",
      "Push the sled with short, strong steps.",
      "Walk a short distance and rest.",
    ],
    benefits: "Leg strength and endurance without an eccentric phase, so less muscle soreness.",
  },
  "سورتمه کشیدن": {
    name: "Sled Pull",
    muscleGroup: "Cardio, Hamstrings, Back",
    howTo: [
      "Hold the sled rope.",
      "Walk backwards and pull the sled toward you.",
      "Keep your steps short and steady.",
    ],
    benefits: "Strengthens knees and legs with low impact.",
  },
  "سقوط و برخاستن": {
    name: "Sprawl",
    muscleGroup: "Full body, Cardio",
    howTo: [
      "Place your hands on the floor, jump your feet back and keep your hips down.",
      "Quickly bring your feet back in.",
      "Stand up and repeat.",
    ],
    benefits: "Classic wrestling drill for endurance and speed.",
  },
  "اسکوات تراست": {
    name: "Squat Thrust",
    muscleGroup: "Full body, Cardio, Abs",
    howTo: [
      "Bend down and place your hands on the floor.",
      "Jump your feet back and then return them.",
      "Stand up.",
    ],
    benefits: "A burpee without the push-up, suited to long sets.",
  },
  "دوی درجا": {
    name: "Running in Place",
    muscleGroup: "Cardio, Calves",
    howTo: [
      "Run in place and land on the balls of your feet.",
      "Swing your arms in rhythm.",
      "Keep whatever rhythm feels comfortable.",
    ],
    benefits: "Simple cardio at home or as a warm-up.",
  },
  "پیاده‌روی سریع": {
    name: "Power Walking",
    muscleGroup: "Cardio, Calves",
    howTo: [
      "Walk with quick, long steps.",
      "Swing your arms with bent elbows.",
      "Continue for 30 to 45 minutes.",
    ],
    benefits: "Low-intensity cardio that is always available.",
  },
  "استپ ایروبیک": {
    name: "Step Aerobics",
    muscleGroup: "Cardio, Legs",
    howTo: [
      "Stand in front of the step platform.",
      "Step up and down at a high rhythm.",
      "Change the patterns with the music.",
    ],
    benefits: "Fun cardio that also strengthens the legs.",
  },
  "تمرین تاباتا": {
    name: "Tabata",
    muscleGroup: "Cardio, Full body",
    howTo: [
      "Choose an exercise such as squats or burpees.",
      "Work at maximum effort for 20 seconds, then rest for 10 seconds.",
      "Repeat for 8 rounds (4 minutes).",
    ],
    benefits: "The most intense interval format for aerobic and anaerobic capacity.",
  },
  "تمرین سیرکویی": {
    name: "Circuit Training",
    muscleGroup: "Full body, Cardio",
    howTo: [
      "Choose 5 to 8 different exercises in a row.",
      "Do each exercise for 30 to 45 seconds with short rests.",
      "Repeat for 2 to 4 rounds.",
    ],
    benefits: "Builds strength and endurance together in a short time.",
  },
  "زومبا و رقص هوازی": {
    name: "Dance Cardio",
    muscleGroup: "Cardio",
    howTo: [
      "Choose a dance fitness program or class.",
      "Follow the moves in time with the music.",
      "Continue for 30 to 60 minutes.",
    ],
    benefits: "Enjoyable cardio that helps you stick with training.",
  },
  "دوی بازگشتی": {
    name: "Backpedal",
    muscleGroup: "Cardio, Quads",
    howTo: [
      "Run backwards with short steps.",
      "Keep your weight on your toes with slightly bent knees.",
      "Control your speed.",
    ],
    benefits: "Agility and knee strength in the reverse direction.",
  },
  "گام جانبی سریع": {
    name: "Lateral Shuffle",
    muscleGroup: "Cardio, Glutes",
    howTo: [
      "Stay in a half squat.",
      "Move sideways with quick steps without crossing your feet.",
      "Change direction.",
    ],
    benefits: "Lateral agility for ball sports.",
  },
  "ضربه جلو": {
    name: "Front Kick",
    muscleGroup: "Cardio, Quads, Abs",
    howTo: [
      "Stand in a guard position.",
      "Lift your knee and extend your leg forward.",
      "Bring it back quickly and switch legs.",
    ],
    benefits: "Balance, flexibility and cardio together.",
  },
  "اسکوات جامپ کتل‌بل": {
    name: "Kettlebell Jump Squat",
    muscleGroup: "Leg power, Glutes, Cardio",
    howTo: [
      "Hold the kettlebell by the handle between your legs.",
      "Squat down and jump.",
      "Land softly and repeat.",
    ],
    benefits: "Leg power with a light load.",
  },
};
