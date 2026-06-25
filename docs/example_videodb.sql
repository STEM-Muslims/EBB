/*
 * example_videodb.sql
 * ============================================================
 * SHOWCASE / SAMPLE DATA — NOT FUNCTIONAL
 * ------------------------------------------------------------
 * An illustration of how the content hierarchy looks once
 * populated. Nothing runs this file: the live `topic` table is
 * created by Alembic from backend/app/models/topic.py, and this
 * sample is here only to make the tree concrete for readers.
 *
 * It mirrors the REAL schema (single self-referential `topic`
 * table) using a 3-level `level_type`:
 *     SUBJECT  (top level, parent_id = NULL)
 *       -> TOPIC   (a major area within a subject)
 *         -> VIDEO (a leaf that maps to actual video content)
 *
 * Notes vs. the production table:
 *   - The app orders siblings with a doubly-linked list
 *     (prev_id/next_id). To keep this sample readable we only
 *     set `sort_order` (the legacy fallback); prev_id/next_id
 *     are left NULL.
 *   - There is no multi-parent table — each topic has exactly
 *     one parent_id.
 *   - created_at/updated_at/is_active use their column defaults.
 * ============================================================
 */

-- Reference shape of the real table (abridged — see topic.py / Alembic for the full DDL):
CREATE TABLE topic (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR NOT NULL,
    level_type  VARCHAR NOT NULL CHECK (level_type IN ('SUBJECT', 'TOPIC', 'VIDEO')),
    parent_id   INTEGER REFERENCES topic(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    prev_id     INTEGER REFERENCES topic(id),
    next_id     INTEGER REFERENCES topic(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- SUBJECT — top-level domains (parent_id = NULL)
-- ============================================================
INSERT INTO topic (id, name, level_type, parent_id, sort_order) VALUES
(1,  'Proof',       'SUBJECT', NULL, 1),
(2,  'Algebra',     'SUBJECT', NULL, 2),
(3,  'Calculus',    'SUBJECT', NULL, 3),
(4,  'Geometry',    'SUBJECT', NULL, 4),
(5,  'Statistics',  'SUBJECT', NULL, 5),
(6,  'Mechanics',   'SUBJECT', NULL, 6);

-- ============================================================
-- TOPIC — major areas within a subject
-- ============================================================
INSERT INTO topic (id, name, level_type, parent_id, sort_order) VALUES
-- Proof
(7,  'Proof Techniques',                   'TOPIC', 1,  1),
-- Algebra
(8,  'Functions',                          'TOPIC', 2,  1),
(9,  'Sequences & Series',                 'TOPIC', 2,  2),
(10, 'Exponentials & Logarithms',          'TOPIC', 2,  3),
-- Calculus
(11, 'Differentiation',                    'TOPIC', 3,  1),
(12, 'Integration',                        'TOPIC', 3,  2),
(13, 'Numerical Methods',                  'TOPIC', 3,  3),
-- Geometry
(14, 'Trigonometry',                       'TOPIC', 4,  1),
(15, 'Coordinate Geometry',                'TOPIC', 4,  2),
(16, 'Vectors',                            'TOPIC', 4,  3),
-- Statistics
(17, 'Sampling',                           'TOPIC', 5,  1),
(18, 'Data Presentation & Interpretation', 'TOPIC', 5,  2),
(19, 'Probability',                        'TOPIC', 5,  3),
(20, 'Statistical Distributions',          'TOPIC', 5,  4),
(21, 'Hypothesis Testing',                 'TOPIC', 5,  5),
-- Mechanics
(22, 'Kinematics',                         'TOPIC', 6,  1),
(23, 'Forces & Newton''s Laws',            'TOPIC', 6,  2),
(24, 'Moments',                            'TOPIC', 6,  3);

-- ============================================================
-- VIDEO — leaf topics that map to actual video content
-- (level_type omitted here and set in one UPDATE below)
-- ============================================================
INSERT INTO topic (id, name, parent_id, sort_order) VALUES
-- Proof Techniques (7)
(25, 'Proof by Deduction',                7,  1),
(26, 'Proof by Exhaustion',               7,  2),
(27, 'Proof by Contradiction',            7,  3),
(28, 'Disproof by Counter-Example',       7,  4),
-- Functions (8)
(29, 'Indices & Surds',                   8,  1),
(30, 'Quadratics',                        8,  2),
(31, 'Inequalities',                      8,  3),
(32, 'Partial Fractions',                 8,  4),
(33, 'Modulus Function',                  8,  5),
(34, 'Composite & Inverse Functions',     8,  6),
-- Sequences & Series (9)
(35, 'Arithmetic Sequences',              9,  1),
(36, 'Geometric Sequences',               9,  2),
(37, 'Binomial Expansion',                9,  3),
(38, 'Sigma Notation',                    9,  4),
-- Exponentials & Logarithms (10)
(39, 'Laws of Logarithms',                10, 1),
(40, 'Natural Logarithm & e',             10, 2),
(41, 'Exponential Models',                10, 3),
-- Differentiation (11)
(42, 'Differentiation from First Principles', 11, 1),
(43, 'Product Rule',                      11, 2),
(44, 'Quotient Rule',                     11, 3),
(45, 'Chain Rule',                        11, 4),
(46, 'Implicit Differentiation',          11, 5),
(47, 'Parametric Differentiation',        11, 6),
(48, 'Related Rates of Change',           11, 7),
-- Integration (12)
(49, 'Reverse Chain Rule',                12, 1),
(50, 'Integration by Substitution',       12, 2),
(51, 'Integration by Parts',              12, 3),
(52, 'Integration using Partial Fractions',12, 4),
(53, 'Parametric Integration',            12, 5),
(54, 'Trapezium Rule',                    12, 6),
(55, 'Differential Equations',            12, 7),
-- Numerical Methods (13)
(56, 'Change of Sign Method',             13, 1),
(57, 'Newton-Raphson Method',             13, 2),
(58, 'Fixed Point Iteration',             13, 3),
-- Trigonometry (14)
(59, 'Sine & Cosine Rule',                14, 1),
(60, 'Radians & Arc Length',              14, 2),
(61, 'Small Angle Approximation',         14, 3),
(62, 'Basic Trig Identities',             14, 4),
(63, 'Sec, Cosec & Cot',                  14, 5),
(64, 'Inverse Trig Functions',            14, 6),
(65, 'Addition Formulae',                 14, 7),
(66, 'Double Angle Formulae',             14, 8),
-- Coordinate Geometry (15)
(67, 'Straight Lines',                    15, 1),
(68, 'Circles',                           15, 2),
-- Vectors (16)
(69, '2D Vectors',                        16, 1),
(70, '3D Vectors',                        16, 2),
(71, 'Position Vectors',                  16, 3),
-- Sampling (17)
(72, 'Sampling Methods',                  17, 1),
-- Data Presentation (18)
(73, 'Histograms',                        18, 1),
(74, 'Box Plots & Cumulative Frequency',  18, 2),
(75, 'Outliers & Skewness',               18, 3),
(76, 'PMCC',                              18, 4),
-- Probability (19)
(77, 'Venn Diagrams',                     19, 1),
(78, 'Tree Diagrams',                     19, 2),
(79, 'Conditional Probability',           19, 3),
-- Statistical Distributions (20)
(80, 'Binomial Distribution',             20, 1),
(81, 'Normal Distribution',               20, 2),
(82, 'Normal Approximation to Binomial',  20, 3),
-- Hypothesis Testing (21)
(83, 'Hypothesis Testing for Proportion', 21, 1),
(84, 'Hypothesis Testing for Mean',       21, 2),
(85, 'One & Two-Tailed Tests',            21, 3),
-- Kinematics (22)
(86, 'SUVAT Equations',                   22, 1),
(87, 'Displacement, Velocity & Acceleration Functions', 22, 2),
(88, 'Kinematics Graphs',                 22, 3),
-- Forces & Newton's Laws (23)
(89, 'Resolving Forces',                  23, 1),
(90, 'F=ma Applications',                 23, 2),
(91, 'Connected Particles & Pulleys',     23, 3),
(92, 'Friction',                          23, 4),
-- Moments (24)
(93, 'Equilibrium',                       24, 1),
(94, 'Non-Uniform Rods',                  24, 2);

-- Every row in the block above is a leaf: mark them all as VIDEO. Each VIDEO
-- topic is where real uploaded content would hang in the production app.
UPDATE topic SET level_type = 'VIDEO' WHERE id BETWEEN 25 AND 94;
