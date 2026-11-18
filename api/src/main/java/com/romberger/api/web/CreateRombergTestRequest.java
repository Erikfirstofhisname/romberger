package com.romberger.api.web;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateRombergTestRequest {

  private String filename;

  @NotNull
  @Min(1)
  private Long durationMs;

  @NotNull
  @Min(1)
  private Integer sampleCount;

  @NotBlank
  private String csvContent;

  public String getFilename() {
    return filename;
  }

  public void setFilename(String filename) {
    this.filename = filename;
  }

  public Long getDurationMs() {
    return durationMs;
  }

  public void setDurationMs(Long durationMs) {
    this.durationMs = durationMs;
  }

  public Integer getSampleCount() {
    return sampleCount;
  }

  public void setSampleCount(Integer sampleCount) {
    this.sampleCount = sampleCount;
  }

  public String getCsvContent() {
    return csvContent;
  }

  public void setCsvContent(String csvContent) {
    this.csvContent = csvContent;
  }
}
