package com.romberger.api.web;

import com.romberger.api.domain.RombergTest;
import java.time.Instant;
import java.util.UUID;

public class RombergTestResponse {

  private final UUID id;
  private final Instant createdAt;
  private final String filename;
  private final Long durationMs;
  private final Integer sampleCount;

  public RombergTestResponse(RombergTest test) {
    this.id = test.getId();
    this.createdAt = test.getCreatedAt();
    this.filename = test.getFilename();
    this.durationMs = test.getDurationMs();
    this.sampleCount = test.getSampleCount();
  }

  public UUID getId() {
    return id;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public String getFilename() {
    return filename;
  }

  public Long getDurationMs() {
    return durationMs;
  }

  public Integer getSampleCount() {
    return sampleCount;
  }
}
