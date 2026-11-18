package com.romberger.api.repository;

import com.romberger.api.domain.RombergTest;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RombergTestRepository extends JpaRepository<RombergTest, UUID> {}
