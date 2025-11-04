-- Add adjustment tracking columns to recognition_schedules table
-- This allows tracking adjustments to previously posted schedules

-- Add adjustment columns
ALTER TABLE recognition_schedules
ADD COLUMN is_adjustment BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN adjusts_schedule_id UUID REFERENCES recognition_schedules(id) ON DELETE SET NULL,
ADD COLUMN adjustment_type TEXT CHECK (adjustment_type IN ('retroactive', 'catch_up', 'prospective', 'reversal')),
ADD COLUMN adjustment_reason TEXT;

-- Add comment explaining the structure
COMMENT ON COLUMN recognition_schedules.is_adjustment IS 'TRUE if this is an adjustment entry (not original recognition)';
COMMENT ON COLUMN recognition_schedules.adjusts_schedule_id IS 'Foreign key to the original schedule this adjusts (NULL for original schedules)';
COMMENT ON COLUMN recognition_schedules.adjustment_type IS 'Type of adjustment: retroactive, catch_up, prospective, or reversal';
COMMENT ON COLUMN recognition_schedules.adjustment_reason IS 'Free-text explanation of why the adjustment was made';

-- Index for finding all adjustments to a specific schedule
CREATE INDEX idx_schedules_adjustments ON recognition_schedules(adjusts_schedule_id)
WHERE adjusts_schedule_id IS NOT NULL;

-- Index for filtering by adjustment type
CREATE INDEX idx_schedules_adjustment_type ON recognition_schedules(adjustment_type)
WHERE adjustment_type IS NOT NULL;

-- Index for finding all adjustments (for admin/reporting)
CREATE INDEX idx_schedules_is_adjustment ON recognition_schedules(is_adjustment)
WHERE is_adjustment = true;
