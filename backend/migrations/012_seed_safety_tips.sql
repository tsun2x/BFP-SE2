-- ============================================================
-- 012: Seed real BFP fire safety tips and categories
-- ============================================================

-- Categories
INSERT INTO safety_tip_categories (name, color)
VALUES
  ('Fire Prevention', '#E53935'),
  ('Home Safety', '#FF9800'),
  ('Evacuation & Escape', '#1E88E5'),
  ('Electrical Safety', '#FDD835'),
  ('Kitchen Safety', '#43A047'),
  ('Workplace Safety', '#8E24AA')
ON CONFLICT DO NOTHING;

-- Fire Prevention Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Fire Prevention', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Never leave candles unattended', 'Always extinguish candles before leaving a room or going to sleep. Keep them away from flammable materials such as curtains, books, and paper.'),
  ('Keep flammable materials away from heat', 'Store gasoline, kerosene, LPG tanks, and other flammable liquids in well-ventilated areas away from heat sources and open flames.'),
  ('Avoid overloading electrical outlets', 'Do not plug too many appliances into a single outlet or extension cord. This can cause overheating and electrical fires.'),
  ('Dispose of cigarettes properly', 'Never throw lit cigarettes into trash cans or dry grass. Use proper ashtrays and douse cigarette butts with water before disposal.'),
  ('Maintain a defensible space', 'Clear dry leaves, branches, and combustible debris from around your home, especially during dry season (March–May in the Philippines).'),
  ('Install smoke detectors', 'Place smoke detectors on every floor of your home and test them monthly. Replace batteries at least once a year.'),
  ('Store fireworks safely', 'During fiestas and New Year, keep fireworks in a cool, dry place away from open flames. Never let children handle fireworks unsupervised.')
) AS tips(task, description)
WHERE c.name = 'Fire Prevention'
ON CONFLICT DO NOTHING;

-- Home Safety Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Home Safety', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Have a fire extinguisher at home', 'Keep at least one ABC-type fire extinguisher in an accessible location. Learn the PASS technique: Pull, Aim, Squeeze, Sweep.'),
  ('Create a family escape plan', 'Draw a floor plan with at least two exit routes from every room. Practice fire drills with your family at least twice a year.'),
  ('Keep emergency numbers accessible', 'Post BFP hotline (160), local fire station number, and other emergency contacts near your phone and on your refrigerator.'),
  ('Never block fire exits', 'Keep hallways, stairways, and doorways clear of furniture, boxes, and other obstructions that could slow evacuation.'),
  ('Check LPG connections regularly', 'Inspect your LPG tank hose and regulator for leaks using soapy water. Replace damaged hoses immediately.'),
  ('Teach children about fire safety', 'Explain to children that fire is not a toy. Teach them to stop, drop, and roll if their clothes catch fire.')
) AS tips(task, description)
WHERE c.name = 'Home Safety'
ON CONFLICT DO NOTHING;

-- Evacuation & Escape Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Evacuation & Escape', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Crawl low under smoke', 'Smoke rises, so stay low to the ground where air is cleaner. Cover your nose and mouth with a damp cloth if possible.'),
  ('Feel doors before opening', 'Touch the door and doorknob with the back of your hand. If it is hot, do not open it — fire may be on the other side. Use an alternate exit.'),
  ('Stop, Drop, and Roll', 'If your clothes catch fire: STOP where you are, DROP to the ground, cover your face, and ROLL back and forth until the fire is out.'),
  ('Designate a meeting point', 'Choose a safe meeting place outside your home (e.g., a neighbor''s yard or a street lamp) where family members gather after evacuating.'),
  ('Never go back inside a burning building', 'Once you are safely outside, stay outside. Let firefighters handle the rescue — re-entering a burning structure is extremely dangerous.'),
  ('Call BFP immediately', 'Dial 160 or your local fire station as soon as you are safe. Provide your exact address, the nature of the fire, and whether anyone is trapped.')
) AS tips(task, description)
WHERE c.name = 'Evacuation & Escape'
ON CONFLICT DO NOTHING;

-- Electrical Safety Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Electrical Safety', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Replace frayed or damaged wires', 'Inspect electrical cords regularly. Frayed, cracked, or exposed wires are a major fire hazard. Replace them immediately.'),
  ('Unplug appliances when not in use', 'Phantom loads and faulty wiring can cause fires even when appliances are turned off. Unplug chargers, irons, and other devices.'),
  ('Use proper fuses and circuit breakers', 'Never replace a blown fuse with one of a higher amperage. Use the correct rating to prevent circuit overload.'),
  ('Avoid octopus wiring', 'Plugging multiple extension cords into each other (octopus wiring) overloads circuits. Use a power strip with a built-in circuit breaker instead.'),
  ('Have a licensed electrician inspect wiring', 'If your home is more than 20 years old, have a licensed electrician check the wiring. Outdated wiring (e.g., knob-and-tube) is a fire risk.'),
  ('Keep water away from electricity', 'Never touch electrical appliances or switches with wet hands. Keep appliances away from sinks, bathtubs, and other water sources.')
) AS tips(task, description)
WHERE c.name = 'Electrical Safety'
ON CONFLICT DO NOTHING;

-- Kitchen Safety Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Kitchen Safety', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Never leave cooking unattended', 'Stay in the kitchen while frying, grilling, or broiling. If you must leave, turn off the stove. Unattended cooking is the #1 cause of house fires.'),
  ('Keep flammable items away from the stove', 'Towels, paper, plastic bags, and wooden utensils should be kept at least 1 meter from the burner.'),
  ('Know how to extinguish a grease fire', 'NEVER pour water on a grease fire — it will explode. Smother it by sliding a lid over the pan and turning off the heat.'),
  ('Clean cooking surfaces regularly', 'Grease buildup on stoves, ovens, and range hoods is highly flammable. Clean them regularly to prevent grease fires.'),
  ('Use a timer for cooking', 'Set a timer to remind you that the stove or oven is on, especially for long-cooking items.'),
  ('Keep a fire blanket in the kitchen', 'A fire blanket can smother small fires quickly. Keep one easily accessible near the cooking area.')
) AS tips(task, description)
WHERE c.name = 'Kitchen Safety'
ON CONFLICT DO NOTHING;

-- Workplace Safety Tips
INSERT INTO safety_tips (section, task, description, category_id)
SELECT 'Workplace Safety', task, description, c.id
FROM safety_tip_categories c,
(VALUES
  ('Know your building''s fire exits', 'Familiarize yourself with all fire exits, fire extinguisher locations, and alarm pull stations on your floor.'),
  ('Participate in fire drills', 'Take fire drills seriously. Practice evacuating calmly and quickly to your designated assembly point.'),
  ('Report fire hazards immediately', 'If you notice blocked fire exits, damaged sprinklers, expired extinguishers, or faulty wiring, report it to your safety officer immediately.'),
  ('Do not prop open fire doors', 'Fire doors slow the spread of fire and smoke. Keep them closed at all times unless they are designed to be held open by magnetic devices.'),
  ('Know how to use a fire extinguisher', 'Learn the PASS method: Pull the pin, Aim at the base of the fire, Squeeze the handle, and Sweep side to side.'),
  ('Keep walkways and exits clear', 'Do not store boxes, equipment, or personal items in hallways and near exits. Clear paths save lives during evacuation.')
) AS tips(task, description)
WHERE c.name = 'Workplace Safety'
ON CONFLICT DO NOTHING;
