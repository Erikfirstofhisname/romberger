package com.romberger.api.web;

import com.romberger.api.domain.RombergTest;
import com.romberger.api.repository.RombergTestRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tests")
@CrossOrigin(origins = {"http://localhost:3000"})
public class RombergTestController {

  private static final DateTimeFormatter FILE_TS =
      DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

  private final RombergTestRepository repository;

  public RombergTestController(RombergTestRepository repository) {
    this.repository = repository;
  }

  @PostMapping
  public ResponseEntity<RombergTestResponse> create(@Valid @RequestBody CreateRombergTestRequest request) {
    validateCsv(request.getCsvContent());

    RombergTest test = new RombergTest();
    String filename = request.getFilename();
    if (filename == null || filename.isBlank()) {
      filename = "romberg_" + FILE_TS.format(Instant.now()) + "_" + UUID.randomUUID() + ".csv";
    }
    test.setFilename(filename.trim());
    test.setDurationMs(request.getDurationMs());
    test.setSampleCount(request.getSampleCount());
    test.setCsvContent(request.getCsvContent());

    RombergTest saved = repository.save(test);
    return ResponseEntity.status(HttpStatus.CREATED).body(new RombergTestResponse(saved));
  }

  @GetMapping
  public List<RombergTestResponse> list() {
    return repository.findAll().stream().map(RombergTestResponse::new).toList();
  }

  @GetMapping("/{id}")
  public RombergTestResponse get(@PathVariable UUID id) {
    return repository
        .findById(id)
        .map(RombergTestResponse::new)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test not found"));
  }

  @GetMapping("/{id}/csv")
  public ResponseEntity<String> downloadCsv(@PathVariable UUID id) {
    RombergTest test =
        repository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test not found"));

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + test.getFilename() + "\"")
        .contentType(MediaType.parseMediaType("text/csv"))
        .body(test.getCsvContent());
  }

  private static void validateCsv(String csvContent) {
    String[] lines = csvContent.trim().split("\\R");
    if (lines.length < 2) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV must include a header and at least one row");
    }
    String header = lines[0].trim();
    if (!"ax,ay,az,gx,gy,gz".equals(header)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "CSV header must be exactly: ax,ay,az,gx,gy,gz");
    }
  }
}
