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
  const submitBtnIcon = document.getElementById('submitBtnIcon');
  const analyzeProgressFill = document.getElementById('analyzeProgressFill');
  const analyzePercentPill = document.getElementById('analyzePercentPill');
  const analyzeProgressHint = document.getElementById('analyzeProgressHint');
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
      if (modeCameraBtn) modeCameraBtn.classList.add('active');
      if (modeUploadBtn) modeUploadBtn.classList.remove('active');
      if (viewUpload) viewUpload.style.display = 'none';
      if (!selectedFile && viewCamera) {
        viewCamera.style.display = 'block';
        if (viewPreview) viewPreview.style.display = 'none';
      }
    } else {
      if (modeUploadBtn) modeUploadBtn.classList.add('active');
      if (modeCameraBtn) modeCameraBtn.classList.remove('active');
      stopCamera();
      if (viewCamera) viewCamera.style.display = 'none';
      if (!selectedFile && viewUpload) {
        viewUpload.style.display = 'block';
        if (viewPreview) viewPreview.style.display = 'none';
      }
    }
  }

  if (modeCameraBtn) modeCameraBtn.addEventListener('click', () => switchMode('camera'));
  if (modeUploadBtn) modeUploadBtn.addEventListener('click', () => switchMode('upload'));

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  let availableVideoDevices = [];
  let currentDeviceIndex = 0;

  async function updateVideoDeviceList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableVideoDevices = devices.filter((d) => d.kind === 'videoinput');
      return availableVideoDevices;
    } catch (e) {
      return [];
    }
  }

  // 3. Quản lý Camera Stream trực tiếp & Chuyển đổi Camera
  async function startCamera(facingMode = 'environment', targetDeviceId = null) {
    if (cameraPermHint) cameraPermHint.style.display = 'block';
    hideStatus();

    // 1. DỪNG HẲN luồng camera cũ trước khi yêu cầu mở ống kính mới để giải phóng phần cứng
    stopCameraTracksOnly();

    // 2. Danh sách constraints thử nghiệm từ chi tiết đến linh hoạt nhất
    const constraintList = [];

    // Nếu có chỉ định deviceId cụ thể (cho máy tính nhiều camera hoặc điện thoại nhiều ống kính)
    if (targetDeviceId) {
      constraintList.push({
        video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      constraintList.push({
        video: { deviceId: targetDeviceId },
        audio: false,
      });
    }

    // Thử theo exact facingMode
    constraintList.push({
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Thử theo ideal facingMode
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

    // Fallback cơ bản nhất
    constraintList.push({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    constraintList.push({ video: true, audio: false });

    let stream = null;
    let lastErr = null;

    for (const constraints of constraintList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (stream) {
      cameraStream = stream;
      cameraVideo.srcObject = cameraStream;
      cameraVideo.setAttribute('playsinline', 'true');
      cameraVideo.setAttribute('webkit-playsinline', 'true');
      cameraVideo.setAttribute('autoplay', 'true');
      cameraVideo.setAttribute('muted', 'true');
      try {
        await cameraVideo.play();
      } catch (playErr) {
        console.warn('Camera video play error:', playErr);
      }
      currentFacingMode = facingMode;

      // Cập nhật danh mục camera có trên thiết bị sau khi đã được cấp quyền
      await updateVideoDeviceList();
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const trackSettings = videoTrack.getSettings ? videoTrack.getSettings() : {};
        if (trackSettings.facingMode) {
          currentFacingMode = trackSettings.facingMode;
        }
        if (trackSettings.deviceId && availableVideoDevices.length > 0) {
          const matchedIdx = availableVideoDevices.findIndex((d) => d.deviceId === trackSettings.deviceId);
          if (matchedIdx !== -1) {
            currentDeviceIndex = matchedIdx;
          }
        }
      }

      const cameraErrorBox = document.getElementById('cameraErrorBox');
      if (cameraErrorBox) cameraErrorBox.style.display = 'none';
      if (cameraPermHint) cameraPermHint.style.display = 'none';
      if (cameraStandbyBox) cameraStandbyBox.style.display = 'none';
      if (cameraLiveBox) cameraLiveBox.style.display = 'flex';
      hideStatus();
      return;
    }

    // Neu toan bo deu that bai
    console.error('Lỗi bật camera:', lastErr);
    if (cameraPermHint) cameraPermHint.style.display = 'none';
    stopCamera();

    let errMsg = 'Không thể bật camera.';
    if (lastErr && (lastErr.name === 'NotAllowedError' || lastErr.name === 'PermissionDeniedError')) {
      errMsg = '⚠️ Trình duyệt đang chặn quyền Camera. Vui lòng bấm vào biểu tượng Ổ khóa / Camera trên thanh địa chỉ của trình duyệt để cấp quyền "Cho phép" (Allow) rồi bấm lại "Bật Camera Ngay", hoặc bấm "Chụp từ thiết bị".';
    } else if (lastErr && (lastErr.name === 'NotFoundError' || lastErr.name === 'DevicesNotFoundError' || lastErr.name === 'OverconstrainedError')) {
      errMsg = '⚠️ Không tìm thấy camera khác trên thiết bị này. Bạn có thể sử dụng camera hiện tại hoặc bấm "Chụp từ thiết bị".';
    } else if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      errMsg = '⚠️ Trình duyệt chỉ cho phép bật Live Stream qua HTTPS hoặc localhost. Bạn hãy bấm nút "Chụp từ thiết bị" để mở máy ảnh của điện thoại/máy tính.';
    } else {
      errMsg = '⚠️ Không thể mở camera: ' + (lastErr?.message || 'Thiết bị bận hoặc chưa được cấp quyền') + '. Hãy bấm nút "Chụp từ thiết bị".';
    }

    const cameraErrorBox = document.getElementById('cameraErrorBox');
    if (cameraErrorBox) {
      cameraErrorBox.innerHTML = errMsg;
      cameraErrorBox.style.display = 'block';
    }
    showToast(errMsg, 'error');
  }

  function stopCameraTracksOnly() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
  }

  function stopCamera() {
    stopCameraTracksOnly();
    if (cameraLiveBox) cameraLiveBox.style.display = 'none';
    if (cameraStandbyBox) cameraStandbyBox.style.display = 'block';
  }

  const btnTriggerNativeCam = document.getElementById('btnTriggerNativeCam');
  if (btnTriggerNativeCam) {
    btnTriggerNativeCam.addEventListener('click', () => {
      if (fallbackCameraInput) {
        fallbackCameraInput.click();
      }
    });
  }

  if (startLiveCameraBtn) {
    startLiveCameraBtn.addEventListener('click', () => {
      const cameraErrorBox = document.getElementById('cameraErrorBox');
      if (cameraErrorBox) cameraErrorBox.style.display = 'none';
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startCamera(currentFacingMode);
      } else {
        if (fallbackCameraInput) {
          fallbackCameraInput.click();
        }
      }
    });
  }

  // Đổi Camera (Chuyển camera Trước <-> Sau hoặc xoay vòng các ống kính)
  if (flipLiveCameraBtn) {
    flipLiveCameraBtn.addEventListener('click', async () => {
      if (availableVideoDevices.length === 0) {
        await updateVideoDeviceList();
      }

      const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';

      let nextDeviceId = null;
      if (availableVideoDevices && availableVideoDevices.length > 1) {
        currentDeviceIndex = (currentDeviceIndex + 1) % availableVideoDevices.length;
        nextDeviceId = availableVideoDevices[currentDeviceIndex].deviceId;
      }

      showToast('🔄 Đang chuyển đổi camera...', 'info');
      await startCamera(nextMode, nextDeviceId);
    });
  }

  if (stopLiveCameraBtn) {
    stopLiveCameraBtn.addEventListener('click', stopCamera);
  }

  // Chụp ảnh từ camera video frame
  if (takeSnapshotBtn) {
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
  }

  // 4. Xử lý File đã chọn / đã chụp
  function handleFileSelected(file) {
    if (!file) return;
    selectedFile = file;

    const sectionImageSource = document.getElementById('sectionImageSource');
    const sectionPreviewDiagnose = document.getElementById('sectionPreviewDiagnose');
    const retakeBtn = document.getElementById('retakeBtn');

    if (retakeBtn) {
      if (activeTab === 'upload') {
        retakeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 📁 Chọn ảnh khác`;
      } else {
        retakeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> 📸 Chụp lại ảnh khác`;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewFileName.textContent = file.name || 'Ảnh lá cây vừa chọn';

      viewCamera.style.display = 'none';
      viewUpload.style.display = 'none';
      viewPreview.style.display = 'block';

      if (sectionImageSource) sectionImageSource.style.display = 'none';
      if (sectionPreviewDiagnose) {
        sectionPreviewDiagnose.classList.remove('tab-pane-enter');
        void sectionPreviewDiagnose.offsetWidth;
        sectionPreviewDiagnose.classList.add('tab-pane-enter');
        sectionPreviewDiagnose.style.display = 'block';
      }

      setModalStep(2);

      // Tự động mở Workspace Modal chuyển thẳng vào màn hình Xem trước ảnh & Chẩn đoán
      const workspaceModal = document.getElementById('diagnoseWorkspaceModal');
      if (workspaceModal && (workspaceModal.style.display === 'none' || !workspaceModal.style.display)) {
        workspaceModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    };
    reader.readAsDataURL(file);

    resetAnalysisProgress();
    submitBtn.disabled = false;
    hideAllResults();
    hideStatus();
  }

  function resetToCapture() {
    selectedFile = null;
    previewImg.src = '';
    galleryInput.value = '';
    fallbackCameraInput.value = '';
    resetAnalysisProgress();
    viewPreview.style.display = 'none';

    const sectionImageSource = document.getElementById('sectionImageSource');
    const sectionPreviewDiagnose = document.getElementById('sectionPreviewDiagnose');
    if (sectionPreviewDiagnose) sectionPreviewDiagnose.style.display = 'none';
    if (sectionImageSource) {
      sectionImageSource.classList.remove('tab-pane-enter');
      void sectionImageSource.offsetWidth;
      sectionImageSource.classList.add('tab-pane-enter');
      sectionImageSource.style.display = 'block';
    }

    setModalStep(1);
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

  retakeBtn.addEventListener('click', () => {
    if (activeTab === 'upload') {
      const galleryInput = document.getElementById('galleryInput');
      if (galleryInput) galleryInput.click();
    } else {
      resetToCapture();
    }
  });

  if (retryNonPlantBtn) {
    retryNonPlantBtn.addEventListener('click', () => {
      resetToCapture();
      window.scrollTo({ top: viewCamera.offsetTop - 80, behavior: 'smooth' });
    });
  }

  galleryInput.addEventListener('change', (e) => {
    activeTab = 'upload';
    handleFileSelected(e.target.files[0]);
  });
  fallbackCameraInput.addEventListener('change', (e) => {
    activeTab = 'camera';
    handleFileSelected(e.target.files[0]);
  });

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



  // 6.5 Heatmap toggle events
  if (viewOriginalImgBtn) {
    viewOriginalImgBtn.addEventListener('click', () => {
      viewOriginalImgBtn.classList.add('active');
      viewHeatmapImgBtn.classList.remove('active');
      displayDiagnoseImg.src = currentOriginalImgUrl;
      heatmapCaption.style.display = 'none';
      if (displayDiagnoseImg) {
        displayDiagnoseImg.classList.remove('heatmap-scan-active');
        void displayDiagnoseImg.offsetWidth;
        displayDiagnoseImg.classList.add('heatmap-scan-active');
      }
    });
  }

  if (viewHeatmapImgBtn) {
    viewHeatmapImgBtn.addEventListener('click', () => {
      viewHeatmapImgBtn.classList.add('active');
      viewOriginalImgBtn.classList.remove('active');
      displayDiagnoseImg.src = currentHeatmapImgUrl;
      heatmapCaption.style.display = 'block';
      if (displayDiagnoseImg) {
        displayDiagnoseImg.classList.remove('heatmap-scan-active');
        void displayDiagnoseImg.offsetWidth;
        displayDiagnoseImg.classList.add('heatmap-scan-active');
      }
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
    if (plantResultCard) {
      plantResultCard.classList.remove('reveal-cascade');
      plantResultCard.style.display = 'none';
    }
  }

  // 7.1 Tiến trình thanh chạy % mô phỏng mượt mà khi phân tích AI
  let analysisProgressInterval = null;
  let currentAnalysisPercent = 0;

  function startAnalysisProgress() {
    submitBtn.disabled = true;
    submitBtn.classList.add('is-analyzing');
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    if (submitBtnIcon) submitBtnIcon.style.display = 'none';

    if (analyzeProgressFill) {
      analyzeProgressFill.style.display = 'block';
      analyzeProgressFill.style.width = '0%';
    }
    if (analyzePercentPill) {
      analyzePercentPill.style.display = 'inline-flex';
      analyzePercentPill.textContent = '0%';
    }
    if (analyzeProgressHint) {
      analyzeProgressHint.style.display = 'flex';
      analyzeProgressHint.innerHTML = '<span class="pulse-dot"></span> Đang tải ảnh và khởi tạo mạng nơ-ron AI...';
    }

    currentAnalysisPercent = 0;
    clearInterval(analysisProgressInterval);

    // Kịch bản chuyển giai đoạn chạy % tự nhiên, chân thực
    const stages = [
      { max: 28, step: 2.2, label: 'Đang quét ảnh lá cây...', hint: 'Đang tiền xử lý ảnh & căn chỉnh cấu trúc phiến lá...' },
      { max: 62, step: 1.4, label: 'AI phân tích mạng nơ-ron...', hint: 'Mô hình Deep CNN đang trích xuất đặc trưng bệnh hại...' },
      { max: 86, step: 0.75, label: 'Chẩn đoán bệnh & Heatmap...', hint: 'Đang tính toán bản đồ nhiệt Grad-CAM định vị ổ bệnh...' },
      { max: 96, step: 0.2, label: 'Tổng hợp phác đồ điều trị...', hint: 'Đang truy vấn ngân hàng thuốc BVTV & hoàn tất kết quả...' }
    ];

    let currentStageIndex = 0;

    analysisProgressInterval = setInterval(() => {
      const stage = stages[currentStageIndex];
      if (!stage) return;

      currentAnalysisPercent += stage.step;
      if (currentAnalysisPercent >= stage.max) {
        currentAnalysisPercent = stage.max;
        if (currentStageIndex < stages.length - 1) {
          currentStageIndex++;
        }
      }

      const rounded = Math.min(96, Math.round(currentAnalysisPercent));
      if (analyzeProgressFill) analyzeProgressFill.style.width = `${rounded}%`;
      if (analyzePercentPill) analyzePercentPill.textContent = `${rounded}%`;
      if (submitBtnText) submitBtnText.textContent = stage.label;
      if (analyzeProgressHint) {
        analyzeProgressHint.innerHTML = `<span class="pulse-dot"></span> ${stage.hint}`;
      }
    }, 45);
  }

  function finishAnalysisProgress() {
    return new Promise((resolve) => {
      clearInterval(analysisProgressInterval);
      currentAnalysisPercent = 100;

      if (analyzeProgressFill) {
        analyzeProgressFill.style.width = '100%';
      }
      if (analyzePercentPill) {
        analyzePercentPill.textContent = '100%';
      }
      if (submitBtnText) submitBtnText.textContent = 'Hoàn tất phân tích!';
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (analyzeProgressHint) {
        analyzeProgressHint.innerHTML = '<span class="pulse-dot" style="background:#10b981; box-shadow:0 0 10px #10b981;"></span> Đã hoàn tất chẩn đoán thành công!';
      }

      // Giữ thanh 100% trong 350ms để người dùng thấy rõ kết quả trước khi mở kết quả
      setTimeout(() => {
        resolve();
      }, 350);
    });
  }

  function resetAnalysisProgress() {
    clearInterval(analysisProgressInterval);
    submitBtn.classList.remove('is-analyzing');
    submitBtn.disabled = !selectedFile;
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (submitBtnIcon) submitBtnIcon.style.display = 'inline-block';
    if (analyzeProgressFill) {
      analyzeProgressFill.style.width = '0%';
      analyzeProgressFill.style.display = 'none';
    }
    if (analyzePercentPill) {
      analyzePercentPill.style.display = 'none';
    }
    if (analyzeProgressHint) {
      analyzeProgressHint.style.display = 'none';
    }
    if (submitBtnText) submitBtnText.textContent = 'Phân tích bệnh với mô hình AI ngay';
  }

  // 8. Submit Phân tích
  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    hideAllResults();
    hideStatus();
    startAnalysisProgress();

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
        resetAnalysisProgress();
        showStatus(data.detail || 'Có lỗi xảy ra khi phân tích ảnh.', 'error');
        return;
      }

      // Đẩy tiến trình lên 100% trước khi hiển thị kết quả
      await finishAnalysisProgress();

      // TRƯỜNG HỢP 1: KHÔNG PHẢI CÂY TRỒNG
      if (data.is_plant === false) {
        resetAnalysisProgress();
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
      setModalStep(3);
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

      if (plantResultCard) {
        plantResultCard.classList.remove('reveal-cascade');
        void plantResultCard.offsetWidth;
        plantResultCard.classList.add('reveal-cascade');
        plantResultCard.style.display = 'block';
        plantResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      resetAnalysisProgress();
      showStatus('Không thể kết nối tới server. Vui lòng kiểm tra lại kết nối mạng.', 'error');
    } finally {
      resetAnalysisProgress();
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

  // Kết nối Reach Out với modal chẩn đoán
  const handleReachOutClick = (e) => {
    if (e) e.preventDefault();
    closeAtelierMobileMenu();
    openDiagnoseWorkspace('camera');
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

  /* =====================================================================
     3D PLANT DOCTOR HERO & DIAGNOSIS WORKSPACE CONTROLLER
     ===================================================================== */
  const heroSection = document.getElementById('doctorHero');
  const stageWrapper = document.getElementById('doctor3dStageWrapper');
  const card3d = document.getElementById('doctor3dCard');
  const canvas = document.getElementById('doctor3dCanvas');

  const tabLiveCameraBtn = document.getElementById('tabLiveCameraBtn');
  const tabUploadBtn = document.getElementById('tabUploadBtn');

  // Kiểm tra thiết bị cấu hình thấp hoặc điện thoại di động
  const isLowEndOrMobile =
    ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) ||
    ('deviceMemory' in navigator && navigator.deviceMemory <= 4) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;

  // 1. Tương tác ảnh 3D mượt mà, theo dõi chuyển động chuột & chạm thông minh
  const scanTarget = document.getElementById('doctorScanTarget');
  const imageContainer = document.getElementById('doctorImageContainer');

  if (card3d && stageWrapper) {
    let targetRotX = 0;
    let targetRotY = 0;
    let targetXPercent = 29;
    let targetYPercent = 48;
    let isHovering = false;
    let rAfTilt = null;

    const renderCardTilt = () => {
      if (isHovering) {
        card3d.style.transform = `perspective(1000px) rotateX(${targetRotX.toFixed(2)}deg) rotateY(${targetRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      } else {
        card3d.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
      rAfTilt = null;
    };

    const handlePointerMove = (clientX, clientY) => {
      const rect = stageWrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.max(-0.5, Math.min(0.5, (clientX - rect.left) / rect.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (clientY - rect.top) / rect.height - 0.5));

      targetRotX = -py * 10; // Max 5 deg tilt
      targetRotY = px * 12;
      isHovering = true;

      // Cập nhật điểm sáng lóa (Glare) & tọa độ mục tiêu quét
      const mouseX = ((px + 0.5) * 100).toFixed(1);
      const mouseY = ((py + 0.5) * 100).toFixed(1);
      card3d.style.setProperty('--mouse-x', `${mouseX}%`);
      card3d.style.setProperty('--mouse-y', `${mouseY}%`);

      targetXPercent = 29 + px * 22;
      targetYPercent = 48 + py * 22;
      if (scanTarget) {
        scanTarget.style.setProperty('--target-x', `${targetXPercent.toFixed(1)}%`);
        scanTarget.style.setProperty('--target-y', `${targetYPercent.toFixed(1)}%`);
      }

      if (!rAfTilt) {
        rAfTilt = requestAnimationFrame(renderCardTilt);
      }
    };

    const handlePointerLeave = () => {
      isHovering = false;
      targetRotX = 0;
      targetRotY = 0;
      if (scanTarget) {
        scanTarget.style.setProperty('--target-x', '29%');
        scanTarget.style.setProperty('--target-y', '48%');
      }
      if (!rAfTilt) {
        rAfTilt = requestAnimationFrame(renderCardTilt);
      }
    };

    stageWrapper.addEventListener('pointermove', (e) => {
      handlePointerMove(e.clientX, e.clientY);
    }, { passive: true });

    stageWrapper.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // Hiệu ứng chạm / click tạo sóng xung kích laser
    stageWrapper.addEventListener('click', (e) => {
      const rect = stageWrapper.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Tạo hạt sóng ripple
      const ripple = document.createElement('div');
      ripple.className = 'interactive-click-ripple';
      ripple.style.left = `${clickX}px`;
      ripple.style.top = `${clickY}px`;
      if (imageContainer) {
        imageContainer.appendChild(ripple);
        setTimeout(() => ripple.remove(), 850);
      }

      if (typeof window.triggerParticleWarp === 'function') {
        window.triggerParticleWarp();
      }

      // Kích hoạt rung nhẹ ảnh
      card3d.style.transform = `perspective(1000px) rotateX(${targetRotX.toFixed(2)}deg) rotateY(${targetRotY.toFixed(2)}deg) scale3d(0.98, 0.98, 0.98)`;
      setTimeout(() => {
        if (isHovering) {
          card3d.style.transform = `perspective(1000px) rotateX(${targetRotX.toFixed(2)}deg) rotateY(${targetRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
        } else {
          card3d.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        }
      }, 150);
    });
  }

  // 1.2 Tương tác kiểm tra tiêu bản 3D cho ảnh xem trước trong modal
  const previewImageBox = document.getElementById('previewImageBox');
  if (previewImageBox) {
    previewImageBox.addEventListener('pointermove', (e) => {
      const rect = previewImageBox.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
      const prevRotX = -py * 12;
      const prevRotY = px * 14;
      previewImageBox.style.transform = `perspective(900px) rotateX(${prevRotX.toFixed(2)}deg) rotateY(${prevRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      previewImageBox.style.setProperty('--prev-x', `${((px + 0.5) * 100).toFixed(1)}%`);
      previewImageBox.style.setProperty('--prev-y', `${((py + 0.5) * 100).toFixed(1)}%`);
    }, { passive: true });

    previewImageBox.addEventListener('pointerleave', () => {
      previewImageBox.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  // 2. Bioluminescent 3D Floating Particles (Tối ưu cực đại, dừng hẳn khi mở modal)
  if (canvas) {
    if (isLowEndOrMobile) {
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
      const particleCount = 10;

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
      let isModalOpen = false;
      let lastFrameTime = 0;
      const targetFPSInterval = 1000 / 30;

      const renderParticles = (currentTime) => {
        if (!isHeroInView || document.hidden || isModalOpen) {
          isAnimRunning = false;
          return;
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

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha.toFixed(2)})`;
          ctx.fill();
        }
      };

      const startAnimLoop = () => {
        if (!isAnimRunning && isHeroInView && !document.hidden && !isModalOpen) {
          isAnimRunning = true;
          requestAnimationFrame(renderParticles);
        }
      };

      window.stopBgAnimForModal = () => {
        isModalOpen = true;
      };
      window.resumeBgAnimAfterModal = () => {
        isModalOpen = false;
        startAnimLoop();
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

  // 3. Smooth Modal Popup & Seamless Diagnosis Workspace Activation
  const workspaceModal = document.getElementById('diagnoseWorkspaceModal');
  const closeWorkspaceBtn = document.getElementById('closeDiagnoseWorkspaceBtn');
  const workspaceBackdrop = document.getElementById('diagnoseWorkspaceBackdrop');
  const heroLaunchBtn = document.getElementById('heroLaunchDiagnoseBtn');
  const navDiagnoseBtn = document.getElementById('navDiagnoseBtn');

  function setModalStep(stepNumber) {
    const step1 = document.getElementById('modalStep1');
    const step2 = document.getElementById('modalStep2');
    const step3 = document.getElementById('modalStep3');
    const line1 = document.getElementById('stepperLine1');
    const line2 = document.getElementById('stepperLine2');

    if (step1) {
      step1.classList.toggle('active', stepNumber === 1);
      step1.classList.toggle('done', stepNumber > 1);
    }
    if (step2) {
      step2.classList.toggle('active', stepNumber === 2);
      step2.classList.toggle('done', stepNumber > 2);
    }
    if (step3) {
      step3.classList.toggle('active', stepNumber === 3);
      step3.classList.toggle('done', stepNumber > 3);
    }
    if (line1) line1.classList.toggle('filled', stepNumber >= 2);
    if (line2) line2.classList.toggle('filled', stepNumber >= 3);
  }

  const openDiagnoseWorkspace = (targetMode = 'camera') => {
    if (typeof window.stopBgAnimForModal === 'function') {
      window.stopBgAnimForModal();
    }

    activeTab = targetMode;
    setModalStep(1);

    const modalTitle = document.getElementById('workspaceModalTitle');
    const modalSubtitle = document.getElementById('workspaceModalSubtitle');
    const sectionTitle = document.getElementById('imageSourceSectionTitle');
    const sectionDesc = document.getElementById('imageSourceSectionDesc');
    const retakeBtn = document.getElementById('retakeBtn');
    const sectionImageSource = document.getElementById('sectionImageSource');
    const sectionPreviewDiagnose = document.getElementById('sectionPreviewDiagnose');

    if (sectionImageSource) sectionImageSource.style.display = 'block';
    if (sectionPreviewDiagnose) sectionPreviewDiagnose.style.display = 'none';

    if (targetMode === 'camera') {
      if (modalTitle) modalTitle.textContent = 'Phòng Khám Cây Trồng';
      if (modalSubtitle) modalSubtitle.textContent = 'Chụp ảnh lá cây trực tiếp qua camera & chẩn đoán tức thì';
      if (sectionTitle) sectionTitle.textContent = 'Chụp ảnh lá cây trực tiếp qua camera';
      if (sectionDesc) sectionDesc.textContent = 'Căn chỉnh lá cây vào tâm khung ngắm và bấm nút chụp ảnh bên dưới';
      if (retakeBtn) retakeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> 📸 Chụp lại ảnh khác`;

      if (viewCamera) {
        viewCamera.classList.remove('anim-slide-left', 'anim-slide-right');
        void viewCamera.offsetWidth;
        viewCamera.classList.add('anim-slide-left');
        viewCamera.style.display = 'block';
      }
      if (viewUpload) viewUpload.style.display = 'none';

      // Khởi động Camera trực tiếp
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startCamera(currentFacingMode);
      }

      if (tabLiveCameraBtn) tabLiveCameraBtn.classList.add('active');
      if (tabUploadBtn) tabUploadBtn.classList.remove('active');
    } else if (targetMode === 'upload') {
      if (modalTitle) modalTitle.textContent = 'Phòng Khám Cây Trồng';
      if (modalSubtitle) modalSubtitle.textContent = 'Tải ảnh lá cây từ thiết bị & chẩn đoán bệnh tức thì';
      if (sectionTitle) sectionTitle.textContent = 'Tải ảnh lá cây từ thiết bị';
      if (sectionDesc) sectionDesc.textContent = 'Kéo thả ảnh hoặc chọn ảnh từ thư viện thiết bị';
      if (retakeBtn) retakeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 📁 Chọn ảnh khác`;

      stopCamera();
      if (viewCamera) viewCamera.style.display = 'none';
      if (viewUpload) {
        viewUpload.classList.remove('anim-slide-left', 'anim-slide-right');
        void viewUpload.offsetWidth;
        viewUpload.classList.add('anim-slide-right');
        viewUpload.style.display = 'block';
      }

      if (tabUploadBtn) tabUploadBtn.classList.add('active');
      if (tabLiveCameraBtn) tabLiveCameraBtn.classList.remove('active');
    }

    if (workspaceModal) {
      workspaceModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  const closeDiagnoseWorkspace = () => {
    if (workspaceModal) {
      workspaceModal.style.display = 'none';
      document.body.style.overflow = '';
    }

    if (typeof window.resumeBgAnimAfterModal === 'function') {
      window.resumeBgAnimAfterModal();
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

  // Nút 1: Camera -> Mở ngay Popup Modal Phòng Khám Bác Sĩ Cây Trồng
  if (tabLiveCameraBtn) {
    tabLiveCameraBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.triggerParticleWarp === 'function') {
        window.triggerParticleWarp();
      }

      // 1. Luôn hiển thị Cửa Sổ Popup Modal lên màn hình!
      openDiagnoseWorkspace('camera');

      const cameraErrorBox = document.getElementById('cameraErrorBox');
      if (cameraErrorBox) cameraErrorBox.style.display = 'none';

      // 2. Kích hoạt camera stream nếu có hỗ trợ WebRTC
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startCamera(currentFacingMode);
      } else {
        if (cameraErrorBox) {
          cameraErrorBox.innerHTML = '💡 Vui lòng bấm nút <strong>"Chụp từ thiết bị"</strong> bên dưới để mở máy ảnh của thiết bị.';
          cameraErrorBox.style.display = 'block';
        }
      }
    });
  }

  // Nút 2: Tải Ảnh Lá Cây -> MỞ NGAY hộp thoại chọn tệp/ảnh từ thiết bị
  if (tabUploadBtn) {
    tabUploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.triggerParticleWarp === 'function') {
        window.triggerParticleWarp();
      }
      openDiagnoseWorkspace('upload');
      const galleryInput = document.getElementById('galleryInput');
      if (galleryInput) {
        galleryInput.click();
      }
    });

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

