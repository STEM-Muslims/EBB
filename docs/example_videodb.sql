/*
 * example_videodb.sql:
 * example of how video content will be structured on the platform
 * level 1 = broad domain (e.g. Calculus)
 * level 2 = subject area (e.g. Differentiation)
 * level 3 = individual video topic (e.g. Chain Rule)
 * only level 3 topics map to actual video content
 */


-- main table
CREATE TABLE topics (
    id          SERIAL PRIMARY KEY,
    topic       VARCHAR(100) NOT NULL,
    parent_id   INTEGER REFERENCES topics(id),
    level       INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3)
);

-- handles multi-parent topics (e.g. Trig under both Geometry & Calculus)
CREATE TABLE topic_parents (
    topic_id    INTEGER REFERENCES topics(id),
    parent_id   INTEGER REFERENCES topics(id),
    PRIMARY KEY (topic_id, parent_id)
);

-- ============================================================
-- LEVEL 1 — broad domains
-- ============================================================
INSERT INTO topics (id, topic, parent_id, level) VALUES
(1,  'Proof',       NULL, 1),
(2,  'Algebra',     NULL, 1),
(3,  'Calculus',    NULL, 1),
(4,  'Geometry',    NULL, 1),
(5,  'Statistics',  NULL, 1),
(6,  'Mechanics',   NULL, 1);

-- ============================================================
-- LEVEL 2 — subject areas
-- ============================================================
INSERT INTO topics (id, topic, parent_id, level) VALUES
-- Proof
(7,  'Proof Techniques',                  1,  2),
-- Algebra
(8,  'Functions',                         2,  2),
(9,  'Sequences & Series',                2,  2),
(10, 'Exponentials & Logarithms',         2,  2),
-- Calculus
(11, 'Differentiation',                   3,  2),
(12, 'Integration',                       3,  2),
(13, 'Numerical Methods',                 3,  2),
-- Geometry  (Trig primary parent = Geometry, secondary = Calculus)
(14, 'Trigonometry',                      4,  2),
(15, 'Coordinate Geometry',               4,  2),
(16, 'Vectors',                           4,  2),
-- Statistics
(17, 'Sampling',                          5,  2),
(18, 'Data Presentation & Interpretation',5,  2),
(19, 'Probability',                       5,  2),
(20, 'Statistical Distributions',         5,  2),
(21, 'Hypothesis Testing',                5,  2),
-- Mechanics
(22, 'Kinematics',                        6,  2),
(23, 'Forces & Newton''s Laws',           6,  2),
(24, 'Moments',                           6,  2);

-- Trig secondary parent (Calculus)
INSERT INTO topic_parents (topic_id, parent_id) VALUES
(14, 4),  -- Geometry (primary)
(14, 3);  -- Calculus  (secondary)

-- ============================================================
-- LEVEL 3 — video content topics
-- ============================================================
INSERT INTO topics (id, topic, parent_id, level) VALUES
-- Proof Techniques (7)
(25, 'Proof by Deduction',                7,  3),
(26, 'Proof by Exhaustion',               7,  3),
(27, 'Proof by Contradiction',            7,  3),
(28, 'Disproof by Counter-Example',       7,  3),
-- Functions (8)
(29, 'Indices & Surds',                   8,  3),
(30, 'Quadratics',                        8,  3),
(31, 'Inequalities',                      8,  3),
(32, 'Partial Fractions',                 8,  3),
(33, 'Modulus Function',                  8,  3),
(34, 'Composite & Inverse Functions',     8,  3),
-- Sequences & Series (9)
(35, 'Arithmetic Sequences',              9,  3),
(36, 'Geometric Sequences',               9,  3),
(37, 'Binomial Expansion',                9,  3),
(38, 'Sigma Notation',                    9,  3),
-- Exponentials & Logarithms (10)
(39, 'Laws of Logarithms',                10, 3),
(40, 'Natural Logarithm & e',             10, 3),
(41, 'Exponential Models',                10, 3),
-- Differentiation (11)
(42, 'Differentiation from First Principles', 11, 3),
(43, 'Product Rule',                      11, 3),
(44, 'Quotient Rule',                     11, 3),
(45, 'Chain Rule',                        11, 3),
(46, 'Implicit Differentiation',          11, 3),
(47, 'Parametric Differentiation',        11, 3),
(48, 'Related Rates of Change',           11, 3),
-- Integration (12)
(49, 'Reverse Chain Rule',                12, 3),
(50, 'Integration by Substitution',       12, 3),
(51, 'Integration by Parts',              12, 3),
(52, 'Integration using Partial Fractions',12,3),
(53, 'Parametric Integration',            12, 3),
(54, 'Trapezium Rule',                    12, 3),
(55, 'Differential Equations',            12, 3),
-- Numerical Methods (13)
(56, 'Change of Sign Method',             13, 3),
(57, 'Newton-Raphson Method',             13, 3),
(58, 'Fixed Point Iteration',             13, 3),
-- Trigonometry (14)
(59, 'Sine & Cosine Rule',                14, 3),
(60, 'Radians & Arc Length',              14, 3),
(61, 'Small Angle Approximation',         14, 3),
(62, 'Basic Trig Identities',             14, 3),
(63, 'Sec, Cosec & Cot',                  14, 3),
(64, 'Inverse Trig Functions',            14, 3),
(65, 'Addition Formulae',                 14, 3),
(66, 'Double Angle Formulae',             14, 3),
-- Coordinate Geometry (15)
(67, 'Straight Lines',                    15, 3),
(68, 'Circles',                           15, 3),
-- Vectors (16)
(69, '2D Vectors',                        16, 3),
(70, '3D Vectors',                        16, 3),
(71, 'Position Vectors',                  16, 3),
-- Sampling (17)
(72, 'Sampling Methods',                  17, 3),
-- Data Presentation (18)
(73, 'Histograms',                        18, 3),
(74, 'Box Plots & Cumulative Frequency',  18, 3),
(75, 'Outliers & Skewness',               18, 3),
(76, 'PMCC',                              18, 3),
-- Probability (19)
(77, 'Venn Diagrams',                     19, 3),
(78, 'Tree Diagrams',                     19, 3),
(79, 'Conditional Probability',           19, 3),
-- Statistical Distributions (20)
(80, 'Binomial Distribution',             20, 3),
(81, 'Normal Distribution',               20, 3),
(82, 'Normal Approximation to Binomial',  20, 3),
-- Hypothesis Testing (21)
(83, 'Hypothesis Testing for Proportion', 21, 3),
(84, 'Hypothesis Testing for Mean',       21, 3),
(85, 'One & Two-Tailed Tests',            21, 3),
-- Kinematics (22)
(86, 'SUVAT Equations',                   22, 3),
(87, 'Displacement, Velocity & Acceleration Functions', 22, 3),
(88, 'Kinematics Graphs',                 22, 3),
-- Forces & Newton's Laws (23)
(89, 'Resolving Forces',                  23, 3),
(90, 'F=ma Applications',                 23, 3),
(91, 'Connected Particles & Pulleys',     23, 3),
(92, 'Friction',                          23, 3),
-- Moments (24)
(93, 'Equilibrium',                       24, 3),
(94, 'Non-Uniform Rods',                  24, 3);
