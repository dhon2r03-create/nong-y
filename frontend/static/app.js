(function () {
  // Mode Selector Tabs
  const modeCameraBtn = document.getElementById('modeCameraBtn');
  const modeUploadBtn = document.getElementById('modeUploadBtn');
  const viewCamera = document.getElementById('viewCamera');
  const viewUpload = document.getElementById('viewUpload');
  const viewPreview = document.getElementById('viewPreview');

  // Camera Elements
  const cameraStandbyBox = document.getElementById('cameraStandbyBox');
  const cameraLiveBox = document.getElementById('cameraLiveBox');
  const startLiveCameraBtn = document.getElementById('startLiveCameraBtn');
  const cameraPermHint = document.getElementById('cameraPermHint');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const flipLiveCameraBtn = document.getElementById('flipLiveCameraBtn');
  const takeSnapshotBtn = document.getElementById('takeSnapshotBtn');
  const stopLiveCameraBtn = document.getElementById('stopLiveCameraBtn');

  // Upload & Preview Elements
  const dropzone = document.getElementById('dropzone');
  const galleryInput = document.getElementById('galleryInput');
  const fallbackCameraInput = document.getElementById('fallbackCameraInput');
  const previewImg = document.getElementById('previewImg');
  const previewFileName = document.getElementById('previewFileName');
  const retakeBtn = document.getElementById('retakeBtn');

  // Submit & Status Elements
  const submitBtn = document.getElementById('submitBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const submitBtnText = document.getElementById('submitBtnText');
  const statusBanner = document.getElementById('statusBanner');

  // Results Elements
  const nonPlantAlert = document.getElementById('nonPlantAlert');
  const nonPlantMessage = document.getElementById('nonPlantMessage');
  const retryNonPlantBtn = document.getElementById('retryNonPlantBtn');
  const detectedObjectBadge = document.getElementById('detectedObjectBadge');
  const retakeRequirementText = document.getElementById('retakeRequirementText');

  const plantResultCard = document.getElementById('plantResultCard');
  const plantHealthPill = document.getElementById('plantHealthPill');
  const plantHealthLabel = document.getElementById('plantHealthLabel');
  const resultDisease = document.getElementById('resultDisease');
  const resultPlant = document.getElementById('resultPlant');
  const resultConfidence = document.getElementById('resultConfidence');
  const confidenceBarFill = document.getElementById('confidenceBarFill');

  // New Enhanced DOM Elements
  const plantFilterSelect = document.getElementById('plantFilterSelect');
  const resultSeverityBadge = document.getElementById('resultSeverityBadge');
  const plantSpeciesChip = document.getElementById('plantSpeciesChip');
  const speciesConfidenceVal = document.getElementById('speciesConfidenceVal');
  const heatmapVisualBox = document.getElementById('heatmapVisualBox');
  const viewOriginalImgBtn = document.getElementById('viewOriginalImgBtn');
  const viewHeatmapImgBtn = document.getElementById('viewHeatmapImgBtn');
  const displayDiagnoseImg = document.getElementById('displayDiagnoseImg');
  const heatmapCaption = document.getElementById('heatmapCaption');
  const topPredictionsList = document.getElementById('topPredictionsList');
  const resultTreatmentSummary = document.getElementById('resultTreatmentSummary');
  const treatmentEmergency = document.getElementById('treatmentEmergency');
  const treatmentBiological = document.getElementById('treatmentBiological');
  const treatmentChemical = document.getElementById('treatmentChemical');
  const treatmentPrevention = document.getElementById('treatmentPrevention');

  // Phone Connect Modal Elements
  const openPhoneModalBtn = document.getElementById('openPhoneModalBtn');
  const phoneModal = document.getElementById('phoneModal');
  const closePhoneModalBtn = document.getElementById('closePhoneModalBtn');
  const qrContainer = document.getElementById('qrContainer');
  const lanUrlInput = document.getElementById('lanUrlInput');
  const copyUrlBtn = document.getElementById('copyUrlBtn');

  // Prescription Elements
  const prescriptionActionBar = document.getElementById('prescriptionActionBar');
  const btnOpenPrescription = document.getElementById('btnOpenPrescription');
  const btnSharePrescription = document.getElementById('btnSharePrescription');
  const prescriptionModal = document.getElementById('prescriptionModal');
  const closePrescriptionModalBtn = document.getElementById('closePrescriptionModalBtn');
  const rxPrescriptionId = document.getElementById('rxPrescriptionId');
  const rxDate = document.getElementById('rxDate');
  const rxPlantName = document.getElementById('rxPlantName');
  const rxDiseaseName = document.getElementById('rxDiseaseName');
  const rxConfidence = document.getElementById('rxConfidence');
  const rxSeverity = document.getElementById('rxSeverity');
  const rxOriginalImg = document.getElementById('rxOriginalImg');
  const rxHeatmapImg = document.getElementById('rxHeatmapImg');
  const rxChemicalContent = document.getElementById('rxChemicalContent');
  const rxEmergencyContent = document.getElementById('rxEmergencyContent');
  const rxBiologicalContent = document.getElementById('rxBiologicalContent');
  const btnDownloadPng = document.getElementById('btnDownloadPng');
  const btnCopyPrescriptionText = document.getElementById('btnCopyPrescriptionText');
  const btnPrintPrescription = document.getElementById('btnPrintPrescription');

  let lastDiagnosisData = null;
  let selectedFile = null;
  let cameraStream = null;
  let currentFacingMode = 'environment';
  let activeTab = 'camera'; // 'camera' or 'upload'
  let geo = { latitude: null, longitude: null };
  let currentOriginalImgUrl = '';
  let currentHeatmapImgUrl = '';

  // 0. Nạp danh mục loài cây vào Dropdown
  async function loadSupportedPlants() {
    if (!plantFilterSelect) return;
    try {
      const res = await fetch('/api/plants');
      if (res.ok) {
        const plants = await res.json();
        plantFilterSelect.innerHTML = plants
          .map((p) => `<option value="${p.id}">${p.icon} ${p.name}</option>`)
          .join('');
      }
    } catch (e) {
      console.warn('Không thể nạp danh mục cây trồng:', e);
    }
  }
  loadSupportedPlants();


  // 1. Geolocation (tùy chọn)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geo.latitude = pos.coords.latitude;
        geo.longitude = pos.coords.longitude;
      },
      () => {},
      { timeout: 4000 }
    );
  }

  // 2. Chuyển đổi Tab Chế độ (Camera vs Tải ảnh)
  function switchMode(mode) {
    activeTab = mode;
    hideAllResults();
    hideStatus();

    if (mode === 'camera') {
      modeCameraBtn.classList.add('active');
      modeUploadBtn.classList.remove('active');
      viewUpload.style.display = 'none';
      if (!selectedFile) {
        viewCamera.style.display = 'block';
        viewPreview.style.display = 'none';
      }
    } else {
      modeUploadBtn.classList.add('active');
      modeCameraBtn.classList.remove('active');
      stopCamera();
      viewCamera.style.display = 'none';
      if (!selectedFile) {
        viewUpload.style.display = 'block';
        viewPreview.style.display = 'none';
      }
    }
  }

  modeCameraBtn.addEventListener('click', () => switchMode('camera'));
  modeUploadBtn.addEventListener('click', () => switchMode('upload'));

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 3. Quản lý Camera Stream trực tiếp
  async function startCamera(facingMode = 'environment') {
    if (cameraPermHint) cameraPermHint.style.display = 'block';
    hideStatus();

    const isMobile = isMobileDevice();

    // Danh sach constraints thu nghiem tu chi tiet den don gian nhat
    const constraintList = [];

    if (isMobile) {
      // Dien thoai: uu tien camera sau (environment) de chup ngoai vuon
      constraintList.push({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      constraintList.push({
        video: { facingMode: facingMode },
        audio: false,
      });
    } else {
      // May tinh / Mac: Khong ep buoc facingMode vi Mac FaceTime Camera chi co 1 huong
      constraintList.push({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    }

    // Mức fallback co ban nhat luon chay duoc tren moi webcam: video: true
    constraintList.push({ video: true, audio: false });

    let stream = null;
    let lastErr = null;

    for (const constraints of constraintList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastErr = err;
        console.warn('Constraint camera không khả dụng, đang thử cấu hình tiếp theo...', err);
      }
    }

    if (stream) {
      stopCamera();
      cameraStream = stream;
      cameraVideo.srcObject = cameraStream;
      currentFacingMode = facingMode;

      if (cameraPermHint) cameraPermHint.style.display = 'none';
      cameraStandbyBox.style.display = 'none';
      cameraLiveBox.style.display = 'flex';
      hideStatus();
      return;
    }

    // Neu toan bo deu that bai
    console.error('Lỗi bật camera:', lastErr);
    if (cameraPermHint) cameraPermHint.style.display = 'none';
    stopCamera();

    let errMsg = 'Không thể bật camera.';
    if (lastErr && (lastErr.name === 'NotAllowedError' || lastErr.name === 'PermissionDeniedError')) {
      errMsg = '⚠️ Trình duyệt đang chặn quyền Camera. Vui lòng bấm vào biểu tượng Ổ khóa / Camera trên thanh địa chỉ của trình duyệt để cấp quyền "Cho phép" (Allow) rồi bấm lại nút Bật Camera.';
    } else if (lastErr && (lastErr.name === 'NotFoundError' || lastErr.name === 'DevicesNotFoundError')) {
      errMsg = '⚠️ Không tìm thấy webcam / camera trên máy tính. Vui lòng chuyển sang tab "Tải ảnh từ máy" bên cạnh.';
    } else if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      errMsg = '⚠️ Trình duyệt chỉ cho phép bật Live Camera qua kết nối HTTPS hoặc http://localhost. Vui lòng truy cập qua localhost hoặc dùng tab "Tải ảnh từ máy".';
    } else {
      errMsg = '⚠️ Không thể mở camera: ' + (lastErr?.message || 'Thiết bị bận hoặc chưa được cấp quyền');
    }

    showStatus(errMsg, 'error');

    // TUYỆT ĐỐI KHÔNG tự động click fallbackCameraInput trên Máy tính Desktop (tránh bung cửa sổ Finder thư mục)
    // Chỉ fallback trên điện thoại di động
    if (isMobile && lastErr && lastErr.name !== 'NotAllowedError') {
      setTimeout(() => {
        fallbackCameraInput.click();
      }, 800);
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
    cameraLiveBox.style.display = 'none';
    cameraStandbyBox.style.display = 'block';
  }

  startLiveCameraBtn.addEventListener('click', () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startCamera(currentFacingMode);
    } else {
      if (isMobileDevice()) {
        fallbackCameraInput.click();
      } else {
        showStatus('⚠️ Trình duyệt không hỗ trợ Live Camera hoặc đang chạy qua HTTP không bảo mật. Vui lòng chuyển sang tab "Tải ảnh từ máy".', 'error');
      }
    }
  });

  flipLiveCameraBtn.addEventListener('click', () => {
    const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  });


  stopLiveCameraBtn.addEventListener('click', stopCamera);

  // Chụp ảnh từ camera video frame
  takeSnapshotBtn.addEventListener('click', () => {
    if (!cameraVideo.videoWidth) return;

    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    cameraCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      stopCamera();
      handleFileSelected(file);
    }, 'image/jpeg', 0.92);
  });

  // 4. Xử lý File đã chọn / đã chụp
  function handleFileSelected(file) {
    if (!file) return;
    selectedFile = file;

    const sectionImageSource = document.getElementById('sectionImageSource');
    const sectionPreviewDiagnose = document.getElementById('sectionPreviewDiagnose');

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewFileName.textContent = file.name || 'Ảnh lá cây vừa tải lên';

      viewCamera.style.display = 'none';
      viewUpload.style.display = 'none';
      viewPreview.style.display = 'block';

      if (sectionImageSource) sectionImageSource.style.display = 'none';
      if (sectionPreviewDiagnose) sectionPreviewDiagnose.style.display = 'block';

      // Tự động mở Workspace Modal chuyển thẳng vào màn hình Xem trước ảnh & Chẩn đoán
      const workspaceModal = document.getElementById('diagnoseWorkspaceModal');
      if (workspaceModal && (workspaceModal.style.display === 'none' || !workspaceModal.style.display)) {
        workspaceModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    };
    reader.readAsDataURL(file);

    submitBtn.disabled = false;
    hideAllResults();
    hideStatus();
  }

  function resetToCapture() {
    selectedFile = null;
    previewImg.src = '';
    galleryInput.value = '';
    fallbackCameraInput.value = '';
    submitBtn.disabled = true;
    viewPreview.style.display = 'none';

    const sectionImageSource = document.getElementById('sectionImageSource');
    const sectionPreviewDiagnose = document.getElementById('sectionPreviewDiagnose');
    if (sectionPreviewDiagnose) sectionPreviewDiagnose.style.display = 'none';
    if (sectionImageSource) sectionImageSource.style.display = 'block';

    hideAllResults();
    hideStatus();

    if (activeTab === 'camera') {
      viewCamera.style.display = 'block';
      viewUpload.style.display = 'none';
      startCamera(currentFacingMode);
    } else {
      viewCamera.style.display = 'none';
      viewUpload.style.display = 'block';
    }
  }

  retakeBtn.addEventListener('click', resetToCapture);
  if (retryNonPlantBtn) {
    retryNonPlantBtn.addEventListener('click', () => {
      resetToCapture();
      window.scrollTo({ top: viewCamera.offsetTop - 80, behavior: 'smooth' });
    });
  }

  galleryInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));
  fallbackCameraInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));

  // 5. Drag & Drop
  ['dragenter', 'dragover'].forEach((evName) => {
    dropzone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach((evName) => {
    dropzone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  // 6. Phone Connect Modal
  async function loadNetworkInfo() {
    try {
      qrContainer.innerHTML = '<div class="qr-loading">Đang tạo mã QR...</div>';
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        if (lanUrlInput) lanUrlInput.value = data.lan_url;
        if (data.qr_svg && data.qr_svg.trim().startsWith('<svg')) {
          qrContainer.innerHTML = data.qr_svg;
        } else if (data.lan_url) {
          const encoded = encodeURIComponent(data.lan_url);
          qrContainer.innerHTML = `<img src="/api/qr-code?url=${encoded}" alt="Mã QR" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}'" />`;
        } else {
          qrContainer.innerHTML = '<div class="qr-loading">Không thể nạp mã QR. Vui lòng thử lại.</div>';
        }

        const networkTipBadge = document.getElementById('networkTipBadge');
        if (data.is_public && networkTipBadge) {
          networkTipBadge.className = 'wifi-tip-badge public-badge';
          networkTipBadge.innerHTML = '🌐 <span>Đường link <strong>Internet công khai</strong>: Bất kỳ ai cũng có thể truy cập qua 4G, 5G hoặc Wi-Fi khác!</span>';
        }
      }
    } catch (e) {
      console.warn('Lỗi lấy network-info', e);
      if (lanUrlInput && lanUrlInput.value && lanUrlInput.value.startsWith('http')) {
        const encoded = encodeURIComponent(lanUrlInput.value);
        qrContainer.innerHTML = `<img src="/api/qr-code?url=${encoded}" alt="Mã QR" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}'" />`;
      }
    }
  }

  if (openPhoneModalBtn) {
    openPhoneModalBtn.addEventListener('click', () => {
      phoneModal.style.display = 'flex';
      loadNetworkInfo();
    });
  }

  if (closePhoneModalBtn) {
    closePhoneModalBtn.addEventListener('click', () => {
      phoneModal.style.display = 'none';
    });
  }

  if (phoneModal) {
    phoneModal.addEventListener('click', (e) => {
      if (e.target === phoneModal) {
        phoneModal.style.display = 'none';
      }
    });
  }

  if (copyUrlBtn && lanUrlInput) {
    copyUrlBtn.addEventListener('click', () => {
      lanUrlInput.select();
      navigator.clipboard.writeText(lanUrlInput.value);
      const originalText = copyUrlBtn.textContent;
      copyUrlBtn.textContent = 'Đã chép!';
      setTimeout(() => {
        copyUrlBtn.textContent = originalText;
      }, 2000);
    });
  }

  // 6.5 Heatmap toggle events
  if (viewOriginalImgBtn) {
    viewOriginalImgBtn.addEventListener('click', () => {
      viewOriginalImgBtn.classList.add('active');
      viewHeatmapImgBtn.classList.remove('active');
      displayDiagnoseImg.src = currentOriginalImgUrl;
      heatmapCaption.style.display = 'none';
    });
  }

  if (viewHeatmapImgBtn) {
    viewHeatmapImgBtn.addEventListener('click', () => {
      viewHeatmapImgBtn.classList.add('active');
      viewOriginalImgBtn.classList.remove('active');
      displayDiagnoseImg.src = currentHeatmapImgUrl;
      heatmapCaption.style.display = 'block';
    });
  }

  // 7. Helpers
  function showStatus(message, type) {
    statusBanner.textContent = message;
    statusBanner.className = 'status-banner visible ' + type;
  }

  function hideStatus() {
    statusBanner.className = 'status-banner';
    statusBanner.textContent = '';
  }

  function hideAllResults() {
    if (nonPlantAlert) nonPlantAlert.style.display = 'none';
    if (plantResultCard) plantResultCard.style.display = 'none';
  }

  // 8. Submit Phân tích
  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    submitBtn.disabled = true;
    btnSpinner.style.display = 'inline-block';
    submitBtnText.textContent = 'Đang phân tích hình ảnh...';
    hideAllResults();
    hideStatus();

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (plantFilterSelect && plantFilterSelect.value) {
      formData.append('plant_filter', plantFilterSelect.value);
    }
    if (geo.latitude != null) formData.append('latitude', geo.latitude);
    if (geo.longitude != null) formData.append('longitude', geo.longitude);

    try {
      const res = await fetch('/api/predict', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        showStatus(data.detail || 'Có lỗi xảy ra khi phân tích ảnh.', 'error');
        return;
      }

      // TRƯỜNG HỢP 1: KHÔNG PHẢI CÂY TRỒNG
      if (data.is_plant === false) {
        if (detectedObjectBadge) {
          detectedObjectBadge.textContent = 'Phát hiện: ' + (data.detected_object || 'Đối tượng lạ');
        }
        nonPlantMessage.textContent = data.message || 'Không phát hiện thấy lá hoặc cây trồng trong ảnh.';
        if (retakeRequirementText && data.suggested_action) {
          retakeRequirementText.innerHTML = data.suggested_action;
        }
        nonPlantAlert.style.display = 'flex';
        nonPlantAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      // TRƯỜNG HỢP 2: CÂY TRỒNG HỢP LỆ
      lastDiagnosisData = data;
      resultDisease.textContent = data.disease_name;
      resultPlant.textContent = 'Cây: ' + data.plant_name;
      resultConfidence.textContent = data.confidence + '%';
      confidenceBarFill.style.width = Math.min(100, data.confidence) + '%';

      // 1. Xac suat loai cay tong hop
      if (data.plant_species_confidence && plantSpeciesChip && speciesConfidenceVal) {
        plantSpeciesChip.style.display = 'inline-flex';
        speciesConfidenceVal.textContent = data.plant_species_confidence + '%';
      }

      // 2. Health & Severity pills
      const isHealthy = data.disease_name.toLowerCase().includes('khỏe');
      if (isHealthy) {
        plantHealthPill.className = 'diagnosis-status-pill healthy';
        plantHealthLabel.textContent = 'Cây khỏe mạnh';
      } else {
        plantHealthPill.className = 'diagnosis-status-pill';
        plantHealthLabel.textContent = 'Phát hiện bệnh hại';
      }

      if (resultSeverityBadge) {
        const sev = (data.treatment && data.treatment.severity) || 'Trung bình';
        resultSeverityBadge.textContent = 'Mức gây hại: ' + sev;
        if (sev.toLowerCase().includes('cao') || sev.toLowerCase().includes('nguy') || sev.toLowerCase().includes('rất')) {
          resultSeverityBadge.className = 'severity-badge severity-danger';
        } else if (sev.toLowerCase().includes('an toan') || sev.toLowerCase().includes('an toàn')) {
          resultSeverityBadge.className = 'severity-badge severity-safe';
        } else {
          resultSeverityBadge.className = 'severity-badge severity-medium';
        }
      }

      // 3. Grad-CAM Heatmap Image
      currentOriginalImgUrl = data.image_url;
      currentHeatmapImgUrl = data.heatmap_url || data.image_url;
      if (heatmapVisualBox && displayDiagnoseImg) {
        heatmapVisualBox.style.display = 'block';
        displayDiagnoseImg.src = currentHeatmapImgUrl;
        if (viewHeatmapImgBtn && viewOriginalImgBtn) {
          viewHeatmapImgBtn.classList.add('active');
          viewOriginalImgBtn.classList.remove('active');
        }
        if (heatmapCaption) heatmapCaption.style.display = 'block';
      }

      // 4. Render Top-3 Predictions
      if (topPredictionsList && data.top_predictions && data.top_predictions.length > 0) {
        const getSevClass = (s) => {
          if (!s) return 'tag-medium';
          const low = s.toLowerCase();
          if (low.includes('an toan') || low.includes('an toàn')) return 'tag-safe';
          if (low.includes('cao') || low.includes('nguy') || low.includes('rất')) return 'tag-danger';
          return 'tag-medium';
        };

        topPredictionsList.innerHTML = data.top_predictions
          .map((pred, idx) => {
            const isTop1 = idx === 0;
            const sevClass = getSevClass(pred.severity);
            return `
              <div class="top-pred-item ${isTop1 ? 'top1-highlight' : ''}">
                <div class="top-pred-rank">#${idx + 1}</div>
                <div class="top-pred-info">
                  <div class="top-pred-name-row">
                    <strong class="top-pred-disease">${pred.disease_name}</strong>
                    <span class="top-pred-plant">(${pred.plant_name})</span>
                    <span class="top-pred-sev-tag ${sevClass}" title="Mức độ nguy hại đối với cây trồng">Mức hại: ${pred.severity}</span>
                  </div>
                  <div class="top-pred-bar-track">
                    <div class="top-pred-bar-fill" style="width: ${Math.min(100, pred.confidence)}%;"></div>
                  </div>
                </div>
                <div class="top-pred-pct-group">
                  <div class="top-pred-pct">${pred.confidence}%</div>
                  <div class="top-pred-pct-sub">độ tin cậy</div>
                </div>
              </div>
            `;
          })
          .join('');
      }

      // 5. Render 4-tier structured treatments
      if (data.treatment) {
        if (resultTreatmentSummary) resultTreatmentSummary.textContent = data.treatment.summary || '';
        if (treatmentEmergency) treatmentEmergency.textContent = data.treatment.emergency || 'Chưa có thông tin.';
        if (treatmentBiological) treatmentBiological.textContent = data.treatment.biological || 'Chưa có thông tin.';
        if (treatmentChemical) treatmentChemical.textContent = data.treatment.chemical || 'Chưa có thông tin.';
        if (treatmentPrevention) treatmentPrevention.textContent = data.treatment.prevention || 'Chưa có thông tin.';
      }

      plantResultCard.style.display = 'block';
      plantResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      showStatus('Không thể kết nối tới server. Vui lòng kiểm tra lại kết nối mạng.', 'error');
    } finally {
      submitBtn.disabled = false;
      btnSpinner.style.display = 'none';
      submitBtnText.textContent = 'Phân tích bệnh cây trồng';
    }
  });

  // =====================================================================
  // 9. TOAST NOTIFICATIONS
  // =====================================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg ' + (type === 'success' ? 'toast-success' : '');
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3200);
  }

  // =====================================================================
  // 10. PHIẾU TOA THUỐC BVTV & CHIA SẺ ZALO
  // =====================================================================
  function generatePrescriptionId() {
    const d = new Date();
    const dateStr = d.getFullYear().toString().slice(2) + 
      String(d.getMonth() + 1).padStart(2, '0') + 
      String(d.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `#NY-${dateStr}-${rnd}`;
  }

  function getFormattedPrescriptionDate() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} · ${dateStr}`;
  }

  function populatePrescriptionModal(data) {
    if (!data) return;
    if (rxPrescriptionId) rxPrescriptionId.textContent = generatePrescriptionId();
    if (rxDate) rxDate.textContent = getFormattedPrescriptionDate();
    if (rxPlantName) rxPlantName.textContent = data.plant_name || 'Cây trồng';
    if (rxDiseaseName) rxDiseaseName.textContent = data.disease_name || 'Không xác định';
    if (rxConfidence) rxConfidence.textContent = (data.confidence || 0) + '%';
    
    const sev = (data.treatment && data.treatment.severity) || 'Trung bình';
    if (rxSeverity) {
      rxSeverity.textContent = sev;
      if (sev.toLowerCase().includes('cao') || sev.toLowerCase().includes('nguy') || sev.toLowerCase().includes('rất')) {
        rxSeverity.className = 'rx-badge rx-badge-sev tag-danger';
      } else if (sev.toLowerCase().includes('an toan') || sev.toLowerCase().includes('an toàn')) {
        rxSeverity.className = 'rx-badge rx-badge-sev tag-safe';
      } else {
        rxSeverity.className = 'rx-badge rx-badge-sev tag-medium';
      }
    }

    if (rxOriginalImg) rxOriginalImg.src = data.image_url || '';
    if (rxHeatmapImg) rxHeatmapImg.src = data.heatmap_url || data.image_url || '';

    if (rxChemicalContent) {
      rxChemicalContent.textContent = (data.treatment && data.treatment.chemical) || 'Tham khảo kỹ sư nông nghiệp hoặc đại lý thuốc BVTV tại địa phương.';
    }
    if (rxEmergencyContent) {
      rxEmergencyContent.textContent = (data.treatment && data.treatment.emergency) || 'Cách ly cây bệnh, tạm ngừng bón đạm, tiêu hủy cành lá nhiễm nặng.';
    }
    if (rxBiologicalContent) {
      rxBiologicalContent.textContent = (data.treatment && data.treatment.biological) || 'Bổ sung chế phẩm sinh học Trichoderma và phân hữu cơ vi sinh.';
    }
  }

  function openPrescriptionModal() {
    if (!lastDiagnosisData) {
      showToast('⚠️ Vui lòng thực hiện chẩn đoán trước khi xuất toa thuốc!', 'error');
      return;
    }
    populatePrescriptionModal(lastDiagnosisData);
    if (prescriptionModal) prescriptionModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closePrescriptionModal() {
    if (prescriptionModal) prescriptionModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function getWrappedLines(ctx, text, maxWidth) {
    const words = (text || '').split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  async function generatePrescriptionCanvas(data) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 1080;

    const [origImg, heatImg] = await Promise.all([
      loadImage(data.image_url),
      loadImage(data.heatmap_url || data.image_url)
    ]);

    ctx.font = '22px system-ui, -apple-system, sans-serif';
    const contentMaxWidth = W - 140;
    const chemicalLines = getWrappedLines(ctx, (data.treatment && data.treatment.chemical) || 'Tham khảo kỹ sư nông nghiệp hoặc đại lý thuốc BVTV tại địa phương.', contentMaxWidth - 40);
    const emergencyLines = getWrappedLines(ctx, (data.treatment && data.treatment.emergency) || 'Cách ly cây bệnh, tạm ngừng bón đạm, tỉa bỏ cành lá nhiễm nặng.', contentMaxWidth - 40);
    const biologicalLines = getWrappedLines(ctx, (data.treatment && data.treatment.biological) || 'Bổ sung chế phẩm nấm đối kháng Trichoderma, phân hữu cơ hoai mục.', contentMaxWidth - 40);

    const chemBlockH = 50 + chemicalLines.length * 32 + 24;
    const emergBlockH = 50 + emergencyLines.length * 32 + 24;
    const bioBlockH = 50 + biologicalLines.length * 32 + 24;

    const totalH = 200 + 170 + 350 + 70 + chemBlockH + emergBlockH + bioBlockH + 180 + 120;
    canvas.width = W;
    canvas.height = Math.max(1650, totalH);

    // Background trắng
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, canvas.height);

    // Khung viền kép
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, canvas.height - 20);

    // Banner xanh lá phía trên
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#059669');
    grad.addColorStop(1, '#10b981');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 18);

    // Tiêu đề thương hiệu
    let curY = 70;
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('🌿 HỆ THỐNG NÔNG Y AI', 60, curY);

    const rxId = (rxPrescriptionId && rxPrescriptionId.textContent) || generatePrescriptionId();
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 22px monospace';
    const rxIdWidth = ctx.measureText(rxId).width;
    ctx.fillText(rxId, W - 60 - rxIdWidth, curY - 6);

    curY += 34;
    ctx.fillStyle = '#64748b';
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText('Chẩn đoán bệnh thực vật & Toa thuốc bảo vệ thực vật số hóa', 60, curY);

    const dateStr = (rxDate && rxDate.textContent) || getFormattedPrescriptionDate();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    const dateWidth = ctx.measureText(dateStr).width;
    ctx.fillText(dateStr, W - 60 - dateWidth, curY);

    // Đường kẻ phân cách
    curY += 28;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, curY);
    ctx.lineTo(W - 60, curY);
    ctx.stroke();

    // Hộp thông tin chẩn đoán
    curY += 30;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, curY, W - 120, 120, 16);
    else ctx.rect(60, curY, W - 120, 120);
    ctx.fill();
    ctx.stroke();

    const boxInnerY = curY + 45;
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Cây trồng:', 90, boxInnerY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.plant_name || 'Cây trồng', 210, boxInnerY);

    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Bệnh hại:', 540, boxInnerY);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.disease_name || 'Không xác định', 650, boxInnerY);

    const boxInnerY2 = boxInnerY + 44;
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Độ tin cậy AI:', 90, boxInnerY2);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText((data.confidence || 0) + '%', 250, boxInnerY2);

    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Mức gây hại:', 540, boxInnerY2);
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText((data.treatment && data.treatment.severity) || 'Trung bình', 680, boxInnerY2);

    // Hai khung ảnh so sánh
    curY += 150;
    const imgBoxW = (W - 140) / 2;
    const imgBoxH = 260;

    // Ảnh 1: Hiện trường
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(60, curY, imgBoxW, imgBoxH);
    if (origImg) {
      ctx.drawImage(origImg, 60, curY, imgBoxW, imgBoxH);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(60, curY + imgBoxH - 36, imgBoxW, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('📷 Ảnh thực tế hiện trường', 75, curY + imgBoxH - 12);

    // Ảnh 2: Grad-CAM
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W / 2 + 10, curY, imgBoxW, imgBoxH);
    if (heatImg) {
      ctx.drawImage(heatImg, W / 2 + 10, curY, imgBoxW, imgBoxH);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(W / 2 + 10, curY + imgBoxH - 36, imgBoxW, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('🔥 Vùng tổn thương nấm bệnh (Grad-CAM)', W / 2 + 25, curY + imgBoxH - 12);

    // Tiêu đề Toa thuốc Rx
    curY += imgBoxH + 50;
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold italic 34px serif';
    ctx.fillText('Rx', 60, curY);
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('CHỈ ĐỊNH THUỐC BVTV & BIỆN PHÁP ĐIỀU TRỊ', 115, curY - 2);

    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, curY + 12);
    ctx.lineTo(W - 60, curY + 12);
    ctx.stroke();

    curY += 30;

    function drawCanvasBlock(title, lines, bg, border, titleColor, yPos, blockH) {
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(60, yPos, W - 120, blockH, 12);
      else ctx.rect(60, yPos, W - 120, blockH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = titleColor;
      ctx.fillRect(60, yPos, 8, blockH);

      ctx.fillStyle = titleColor;
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(title, 85, yPos + 36);

      ctx.fillStyle = '#334155';
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      let textY = yPos + 72;
      for (const line of lines) {
        ctx.fillText(line, 85, textY);
        textY += 32;
      }
    }

    // Khối hóa học
    drawCanvasBlock('🧪 Thuốc BVTV & Hoạt chất hóa học đặc trị:', chemicalLines, '#f0f9ff', '#b9e6fe', '#0284c7', curY, chemBlockH);
    curY += chemBlockH + 16;

    // Khối khẩn cấp
    drawCanvasBlock('🚨 Xử lý khẩn cấp (trong vòng 24 giờ):', emergencyLines, '#fff1f2', '#fecdd3', '#e11d48', curY, emergBlockH);
    curY += emergBlockH + 16;

    // Khối sinh học
    drawCanvasBlock('🌿 Chế phẩm sinh học & Phục hồi cây trồng:', biologicalLines, '#f0fdf4', '#bbf7d0', '#16a34a', curY, bioBlockH);
    curY += bioBlockH + 24;

    // Khối 4 Đúng
    ctx.fillStyle = '#fefce8';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, curY, W - 120, 120, 12);
    else ctx.rect(60, curY, W - 120, 120);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('🛡️ NGUYÊN TẮC VÀNG 4 ĐÚNG KHI SỬ DỤNG THUỐC BVTV:', 85, curY + 36);

    ctx.fillStyle = '#713f12';
    ctx.font = '19px system-ui, -apple-system, sans-serif';
    ctx.fillText('1. Đúng thuốc: Chọn đúng hoạt chất', 85, curY + 70);
    ctx.fillText('2. Đúng lúc: Phun sáng sớm hoặc chiều mát', 550, curY + 70);
    ctx.fillText('3. Đúng liều: Theo hướng dẫn bao bì', 85, curY + 102);
    ctx.fillText('4. Đúng cách: Phun đều tán, cách ly an toàn', 550, curY + 102);

    curY += 140;

    // Khuyến cáo
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 18px system-ui, -apple-system, sans-serif';
    const discl = '* Đơn thuốc điện tử hỗ trợ kỹ thuật số do Nông Y AI cung cấp. Vui lòng tham khảo ý kiến đại lý BVTV trước khi phối trộn.';
    const disclW = ctx.measureText(discl).width;
    ctx.fillText(discl, (W - disclW) / 2, curY + 20);

    return canvas;
  }

  // Tải file ảnh PNG
  async function downloadPrescriptionImage() {
    if (!lastDiagnosisData) return;
    showToast('⏳ Đang tạo ảnh toa thuốc chất lượng cao...', 'success');
    try {
      const canvas = await generatePrescriptionCanvas(lastDiagnosisData);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dName = (lastDiagnosisData.disease_name || 'benh').toLowerCase().replace(/\s+/g, '-');
        a.download = `toa-thuoc-${dName}-nong-y.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✓ Đã tải ảnh toa thuốc thành công!', 'success');
      }, 'image/png');
    } catch (e) {
      console.error('Lỗi tạo ảnh toa thuốc:', e);
      showToast('❌ Không thể xuất ảnh. Vui lòng thử lại!', 'error');
    }
  }

  // Tạo nội dung văn bản tóm tắt
  function buildPrescriptionSummaryText(data) {
    return [
      `📋 TOA THUỐC BẢO VỆ THỰC VẬT - NÔNG Y AI`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🌱 Cây trồng: ${data.plant_name || 'Cây trồng'}`,
      `🦠 Bệnh hại: ${data.disease_name || 'Không xác định'} (Độ tin cậy: ${data.confidence}%)`,
      `⚠️ Mức gây hại: ${(data.treatment && data.treatment.severity) || 'Trung bình'}`,
      ``,
      `🧪 THUỐC & HOẠT CHẤT ĐẶC TRỊ:`,
      `${(data.treatment && data.treatment.chemical) || 'Tham khảo đại lý BVTV'}`,
      ``,
      `🚨 XỬ LÝ KHẨN CẤP (24H):`,
      `${(data.treatment && data.treatment.emergency) || 'Cách ly cây nhiễm, ngừng bón đạm'}`,
      ``,
      `🌿 SINH HỌC & PHỤC HỒI:`,
      `${(data.treatment && data.treatment.biological) || 'Bổ sung nấm Trichoderma'}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💡 Thực hiện 4 Đúng: Đúng thuốc - Đúng lúc - Đúng liều - Đúng cách!`
    ].join('\n');
  }

  // Sao chép văn bản
  async function copyPrescriptionText() {
    if (!lastDiagnosisData) return;
    const text = buildPrescriptionSummaryText(lastDiagnosisData);
    try {
      await navigator.clipboard.writeText(text);
      showToast('✓ Đã sao chép đơn thuốc! Hãy dán (Ctrl+V / Cmd+V) vào Zalo gửi cho tiệm thuốc.', 'success');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✓ Đã sao chép đơn thuốc vào bộ nhớ tạm!', 'success');
    }
  }

  // Chia sẻ Zalo
  async function sharePrescriptionToZalo() {
    if (!lastDiagnosisData) {
      showToast('⚠️ Vui lòng thực hiện chẩn đoán trước khi chia sẻ!', 'error');
      return;
    }
    const text = buildPrescriptionSummaryText(lastDiagnosisData);

    if (navigator.canShare) {
      try {
        const canvas = await generatePrescriptionCanvas(lastDiagnosisData);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `toa-thuoc-${lastDiagnosisData.disease_name}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Toa thuốc Nông Y AI - ' + lastDiagnosisData.disease_name,
              text: text,
              files: [file]
            });
            showToast('✓ Đã chia sẻ toa thuốc thành công!', 'success');
            return;
          }
          fallbackZaloShare(text);
        }, 'image/png');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Lỗi Web Share:', err);
          fallbackZaloShare(text);
        }
        return;
      }
    }
    fallbackZaloShare(text);
  }

  function fallbackZaloShare(text) {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('📋 Đã sao chép đơn thuốc! Đang mở Zalo & tải ảnh...', 'success');
    downloadPrescriptionImage();
    setTimeout(() => {
      window.open('https://chat.zalo.me', '_blank');
    }, 800);
  }

  // Gắn sự kiện các nút
  if (btnOpenPrescription) btnOpenPrescription.addEventListener('click', openPrescriptionModal);
  if (btnSharePrescription) btnSharePrescription.addEventListener('click', sharePrescriptionToZalo);
  if (closePrescriptionModalBtn) closePrescriptionModalBtn.addEventListener('click', closePrescriptionModal);
  if (btnDownloadPng) btnDownloadPng.addEventListener('click', downloadPrescriptionImage);
  if (btnCopyPrescriptionText) btnCopyPrescriptionText.addEventListener('click', copyPrescriptionText);
  if (btnPrintPrescription) btnPrintPrescription.addEventListener('click', () => window.print());
  if (prescriptionModal) {
    prescriptionModal.addEventListener('click', (e) => {
      if (e.target === prescriptionModal) closePrescriptionModal();
    });
  }

  // =====================================================================
  // ATELIER HERO & MOBILE MENU CONTROLLER
  // =====================================================================
  const atelierHamburgerBtn = document.getElementById('atelierHamburgerBtn');
  const atelierCloseMenuBtn = document.getElementById('atelierCloseMenuBtn');
  const atelierMobileMenu = document.getElementById('atelierMobileMenu');
  const atelierReachOutBtn = document.getElementById('atelierReachOutBtn');
  const atelierMobileReachOutBtn = document.getElementById('atelierMobileReachOutBtn');
  const atelierWatchReelBtn = document.getElementById('atelierWatchReelBtn');
  const atelierBgVideo = document.getElementById('atelierBgVideo');
  const reelBtnText = document.getElementById('reelBtnText');

  function openAtelierMobileMenu() {
    if (!atelierMobileMenu) return;
    atelierMobileMenu.classList.add('is-open');
    if (atelierHamburgerBtn) {
      atelierHamburgerBtn.classList.add('is-open');
      atelierHamburgerBtn.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeAtelierMobileMenu() {
    if (!atelierMobileMenu) return;
    atelierMobileMenu.classList.remove('is-open');
    if (atelierHamburgerBtn) {
      atelierHamburgerBtn.classList.remove('is-open');
      atelierHamburgerBtn.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  if (atelierHamburgerBtn) {
    atelierHamburgerBtn.addEventListener('click', () => {
      if (atelierMobileMenu && atelierMobileMenu.classList.contains('is-open')) {
        closeAtelierMobileMenu();
      } else {
        openAtelierMobileMenu();
      }
    });
  }

  if (atelierCloseMenuBtn) {
    atelierCloseMenuBtn.addEventListener('click', closeAtelierMobileMenu);
  }

  if (atelierMobileMenu) {
    const mobileLinks = atelierMobileMenu.querySelectorAll('a');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeAtelierMobileMenu();
      });
    });
  }

  // Kết nối Reach Out với modal mở trên điện thoại (QR code)
  const handleReachOutClick = (e) => {
    if (e) e.preventDefault();
    closeAtelierMobileMenu();
    const openPhoneModalBtn = document.getElementById('openPhoneModalBtn');
    if (openPhoneModalBtn) {
      openPhoneModalBtn.click();
    } else {
      window.location.href = '#diagnoseCard';
    }
  };

  if (atelierReachOutBtn) atelierReachOutBtn.addEventListener('click', handleReachOutClick);
  if (atelierMobileReachOutBtn) atelierMobileReachOutBtn.addEventListener('click', handleReachOutClick);

  // Watch Reel: Chuyển đổi bật/tắt âm thanh video nền
  if (atelierWatchReelBtn && atelierBgVideo) {
    atelierWatchReelBtn.addEventListener('click', () => {
      if (atelierBgVideo.muted) {
        atelierBgVideo.muted = false;
        atelierBgVideo.play().catch(() => {});
        if (reelBtnText) reelBtnText.textContent = 'Mute Reel';
        if (typeof showToast === 'function') {
          showToast('🔊 Đã bật âm thanh video giới thiệu', 'success');
        }
      } else {
        atelierBgVideo.muted = true;
        if (reelBtnText) reelBtnText.textContent = 'Watch Reel';
        if (typeof showToast === 'function') {
          showToast('🔇 Đã tắt âm thanh video giới thiệu', 'info');
        }
      }
    });
  }
})();

/* =====================================================================
   3D PLANT DOCTOR INTERACTIVE HERO CONTROLLER
   ===================================================================== */
(function initDoctor3DHero() {
  const heroSection = document.getElementById('doctorHero');
  const stageWrapper = document.getElementById('doctor3dStageWrapper');
  const card3d = document.getElementById('doctor3dCard');
  const canvas = document.getElementById('doctor3dCanvas');

  const tabLiveCameraBtn = document.getElementById('tabLiveCameraBtn');
  const tabUploadBtn = document.getElementById('tabUploadBtn');
  const tabPhoneBtn = document.getElementById('tabPhoneBtn');
  const scrollIndicator = document.getElementById('doctorScrollIndicator');

  // Kiểm tra thiết bị cấu hình thấp hoặc điện thoại di động
  const isLowEndOrMobile =
    ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) ||
    ('deviceMemory' in navigator && navigator.deviceMemory <= 4) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;

  // 1. 3D Parallax Tilt (Chỉ chạy trên Desktop cấu hình tốt, tắt 100% trên Mobile để lướt siêu mượt)
  if (card3d && heroSection && !isLowEndOrMobile) {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let isTiltLoopRunning = false;

    const animateTilt = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      card3d.style.transform = `translate3d(0,0,0) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg)`;

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        requestAnimationFrame(animateTilt);
      } else {
        isTiltLoopRunning = false;
        card3d.style.transform = `translate3d(0,0,0) rotateX(${targetX.toFixed(1)}deg) rotateY(${targetY.toFixed(1)}deg)`;
      }
    };

    const requestTiltUpdate = () => {
      if (!isTiltLoopRunning) {
        isTiltLoopRunning = true;
        requestAnimationFrame(animateTilt);
      }
    };

    const onMouseMove = (e) => {
      const rect = card3d.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      const normX = (e.clientX - cardCenterX) / (window.innerWidth / 2);
      const normY = (e.clientY - cardCenterY) / (window.innerHeight / 2);

      targetY = Math.max(-8, Math.min(8, normX * 8));
      targetX = Math.max(-8, Math.min(8, -normY * 8));
      requestTiltUpdate();
    };

    heroSection.addEventListener('mousemove', onMouseMove, { passive: true });
    heroSection.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      requestTiltUpdate();
    });
  } else if (card3d) {
    // Với máy yếu / mobile: Giữ tĩnh 100% để 0% lag
    card3d.style.transform = 'translate3d(0,0,0)';
  }

  // 2. Bioluminescent 3D Floating Particles (Tối ưu cực đại, dừng hẳn khi không xem)
  if (canvas) {
    if (isLowEndOrMobile) {
      // Tắt hoàn toàn Canvas trên máy yếu / điện thoại để tiết kiệm 100% CPU/GPU
      canvas.style.display = 'none';
    } else {
      const ctx = canvas.getContext('2d', { alpha: true });
      let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
      let height = (canvas.height = canvas.offsetHeight || 500);

      window.addEventListener('resize', () => {
        if (!canvas) return;
        width = canvas.width = canvas.offsetWidth || window.innerWidth;
        height = canvas.height = canvas.offsetHeight || 500;
      }, { passive: true });

      const particles = [];
      const particleCount = 10; // Chỉ 10 hạt cực nhẹ

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.8 + 1.0,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.15,
          alpha: Math.random() * 0.4 + 0.3,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          color: '52, 211, 153'
        });
      }

      let isHeroInView = true;
      let isAnimRunning = false;
      let lastFrameTime = 0;
      const targetFPSInterval = 1000 / 30; // Giới hạn 30 FPS siêu mượt & nhẹ máy

      const renderParticles = (currentTime) => {
        if (!isHeroInView || document.hidden) {
          isAnimRunning = false;
          return; // Dừng hẳn vòng lặp, KHÔNG gọi requestAnimationFrame vô ích
        }

        requestAnimationFrame(renderParticles);

        const delta = currentTime - lastFrameTime;
        if (delta < targetFPSInterval) return;
        lastFrameTime = currentTime - (delta % targetFPSInterval);

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particleCount; i++) {
          const p = particles[i];
          p.y += p.vy;
          p.x += p.vx;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          // Vẽ hạt trực tiếp 1 lần
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha.toFixed(2)})`;
          ctx.fill();
        }
      };

      const startAnimLoop = () => {
        if (!isAnimRunning && isHeroInView && !document.hidden) {
          isAnimRunning = true;
          requestAnimationFrame(renderParticles);
        }
      };

      if ('IntersectionObserver' in window && heroSection) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            isHeroInView = entry.isIntersecting;
            if (isHeroInView) {
              startAnimLoop();
            }
          });
        }, { threshold: 0.05 });
        observer.observe(heroSection);
      }

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isHeroInView) {
          startAnimLoop();
        }
      });

      startAnimLoop();
    }
  }

  // 3. Smooth Tab Switching & Seamless Transition into Capture Section
  // 3. Smooth Modal Popup & Seamless Diagnosis Workspace Activation
  const workspaceModal = document.getElementById('diagnoseWorkspaceModal');
  const closeWorkspaceBtn = document.getElementById('closeDiagnoseWorkspaceBtn');
  const workspaceBackdrop = document.getElementById('diagnoseWorkspaceBackdrop');
  const heroLaunchBtn = document.getElementById('heroLaunchDiagnoseBtn');
  const navDiagnoseBtn = document.getElementById('navDiagnoseBtn');

  const openDiagnoseWorkspace = (targetMode = 'camera') => {
    if (typeof window.triggerParticleWarp === 'function') {
      window.triggerParticleWarp();
    }

    if (workspaceModal) {
      workspaceModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    if (targetMode === 'camera') {
      const modeCameraBtn = document.getElementById('modeCameraBtn');
      if (modeCameraBtn) modeCameraBtn.click();

      // Bật ngay stream Camera trực tiếp không để chờ
      setTimeout(() => {
        const startLiveCameraBtn = document.getElementById('startLiveCameraBtn');
        const cameraLiveBox = document.getElementById('cameraLiveBox');
        if (startLiveCameraBtn && (!cameraLiveBox || cameraLiveBox.style.display === 'none')) {
          startLiveCameraBtn.click();
        }
      }, 100);

      if (tabLiveCameraBtn) {
        tabLiveCameraBtn.classList.add('active');
        if (tabUploadBtn) tabUploadBtn.classList.remove('active');
      }
    } else if (targetMode === 'upload') {
      const modeUploadBtn = document.getElementById('modeUploadBtn');
      if (modeUploadBtn) modeUploadBtn.click();

      if (tabUploadBtn) {
        tabUploadBtn.classList.add('active');
        if (tabLiveCameraBtn) tabLiveCameraBtn.classList.remove('active');
      }
    }
  };

  const closeDiagnoseWorkspace = () => {
    if (workspaceModal) {
      workspaceModal.style.display = 'none';
      document.body.style.overflow = '';
    }

    const stopLiveCameraBtn = document.getElementById('stopLiveCameraBtn');
    const cameraLiveBox = document.getElementById('cameraLiveBox');
    if (stopLiveCameraBtn && cameraLiveBox && cameraLiveBox.style.display !== 'none') {
      stopLiveCameraBtn.click();
    }
  };

  if (heroLaunchBtn) {
    heroLaunchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openDiagnoseWorkspace('camera');
    });
  }

  if (navDiagnoseBtn) {
    navDiagnoseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openDiagnoseWorkspace('camera');
    });
  }

  // Nút 1: Khám Live Camera -> Mở modal và BẬT NGAY Live Camera stream
  if (tabLiveCameraBtn) {
    tabLiveCameraBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openDiagnoseWorkspace('camera');
    });
  }

  // Nút 2: Tải Ảnh Lá Cây -> MỞ NGAY hộp thoại chọn tệp/ảnh từ thiết bị
  if (tabUploadBtn) {
    tabUploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.triggerParticleWarp === 'function') {
        window.triggerParticleWarp();
      }
      const galleryInput = document.getElementById('galleryInput');
      if (galleryInput) {
        galleryInput.click();
      }
    });

    // Kéo thả trực tiếp ảnh vào nút trên trang chủ
    tabUploadBtn.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tabUploadBtn.style.borderColor = '#10b981';
      tabUploadBtn.style.transform = 'scale(1.03)';
    });

    tabUploadBtn.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tabUploadBtn.style.borderColor = '';
      tabUploadBtn.style.transform = '';
    });

    tabUploadBtn.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tabUploadBtn.style.borderColor = '';
      tabUploadBtn.style.transform = '';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (tabPhoneBtn) {
    tabPhoneBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const openPhoneModalBtn = document.getElementById('openPhoneModalBtn');
      if (openPhoneModalBtn) {
        openPhoneModalBtn.click();
      }
    });
  }

  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', (e) => {
      e.preventDefault();
      openDiagnoseWorkspace('camera');
    });
  }

  if (closeWorkspaceBtn) {
    closeWorkspaceBtn.addEventListener('click', closeDiagnoseWorkspace);
  }

  if (workspaceBackdrop) {
    workspaceBackdrop.addEventListener('click', closeDiagnoseWorkspace);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && workspaceModal && workspaceModal.style.display === 'flex') {
      closeDiagnoseWorkspace();
    }
  });
})();

