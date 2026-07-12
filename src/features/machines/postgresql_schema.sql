-- ====================================================================
-- PRINTOPIA ERP - MODULE-01: MACHINE MASTER POSTGRESQL SCHEMA
-- ====================================================================
-- This SQL file defines the relational database layout for the
-- Machine Master registry, parent-to-machine sheet mappings, and 
-- configurable supported printing methods. Includes full audit trail.
-- ====================================================================

-- 1. Create Printing Methods Lookup / Constraint Table (Optional but clean)
CREATE TABLE machine_printing_method (
    method_name VARCHAR(50) PRIMARY KEY, -- e.g. 'Sheetwise', 'Work & Turn', 'Work & Tumble', 'Perfecting'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed printing methods
INSERT INTO machine_printing_method (method_name, description) VALUES
('Sheetwise', 'The front of the sheet is printed, then the plate is changed and the back is printed using the same gripper edge.'),
('Work & Turn', 'The front of the sheet is printed, then the sheet is turned left-to-right (retaining same gripper) to print the back with same plate.'),
('Work & Tumble', 'The front of the sheet is printed, then the sheet is tumbled head-to-tail (changing gripper edge) to print the back with same plate.'),
('Perfecting', 'The machine automatically flips the sheet inline to print both sides in a single pass.');


-- 2. Create Machine Master Core Table
CREATE TABLE machine_master (
    id VARCHAR(50) PRIMARY KEY,
    machine_name VARCHAR(150) NOT NULL,
    machine_code VARCHAR(100) UNIQUE NOT NULL,
    machine_type VARCHAR(100) NOT NULL, -- e.g. 'Offset', 'Digital', 'Flexo', etc.
    manufacturer VARCHAR(150) NOT NULL,
    installation_year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    num_colors INTEGER NOT NULL CHECK (num_colors BETWEEN 1 AND 12),
    
    -- Plate specs (mm)
    plate_size_width DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    plate_size_height DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Sheet limits (mm)
    max_sheet_width DECIMAL(10, 2) NOT NULL,
    max_sheet_height DECIMAL(10, 2) NOT NULL,
    min_sheet_width DECIMAL(10, 2) NOT NULL,
    min_sheet_height DECIMAL(10, 2) NOT NULL,
    
    -- Printable area limits (mm)
    printable_area_width DECIMAL(10, 2) NOT NULL,
    printable_area_height DECIMAL(10, 2) NOT NULL,
    
    -- Mechanical safety margins (mm)
    gripper_margin DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    left_margin DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    right_margin DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tail_margin DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Performance specs
    avg_speed INTEGER NOT NULL CHECK (avg_speed > 0), -- sheets per hour
    register_time INTEGER NOT NULL DEFAULT 0, -- setup minutes
    register_wastage INTEGER NOT NULL DEFAULT 0, -- sheets wasted in register setup
    make_ready_wastage INTEGER NOT NULL DEFAULT 0, -- sheets wasted in run make-ready
    
    -- Financials (Rs.)
    plate_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (plate_cost >= 0),
    print_charge_per_1000 DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (print_charge_per_1000 >= 0),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL
);

-- Index for speedy code lookups
CREATE INDEX idx_machine_code ON machine_master(machine_code);


-- 3. Junction table for Machine-to-Printing Method Mappings (Configurable)
CREATE TABLE machine_supported_printing_method (
    machine_id VARCHAR(50) REFERENCES machine_master(id) ON DELETE CASCADE,
    method_name VARCHAR(50) REFERENCES machine_printing_method(method_name) ON DELETE CASCADE,
    PRIMARY KEY (machine_id, method_name)
);


-- 4. Create Machine-Sheet Parent to Machine Sheet Mapping Table
CREATE TABLE machine_sheet_mapping (
    id VARCHAR(50) PRIMARY KEY,
    machine_id VARCHAR(50) REFERENCES machine_master(id) ON DELETE CASCADE,
    parent_width DECIMAL(10, 2) NOT NULL,  -- e.g. 20 inch or mm
    parent_height DECIMAL(10, 2) NOT NULL, -- e.g. 30 inch or mm
    machine_width DECIMAL(10, 2) NOT NULL, -- e.g. 15 inch or mm
    machine_height DECIMAL(10, 2) NOT NULL, -- e.g. 20 inch or mm
    label VARCHAR(100), -- e.g. '20x30 -> 15x20'
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL
);

-- Index for fast queries
CREATE INDEX idx_machine_sheet_mapping_machine ON machine_sheet_mapping(machine_id);


-- 5. Auto-Update Trigger for updated_at Fields
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_machine_master_modtime
    BEFORE UPDATE ON machine_master
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_machine_sheet_mapping_modtime
    BEFORE UPDATE ON machine_sheet_mapping
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
