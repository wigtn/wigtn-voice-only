'use client';

// =============================================================================
// ScenarioSelector - 시나리오 선택 UI 컴포넌트
// =============================================================================
// FE1 소유 - 사용자가 시나리오 타입과 서브타입을 선택하는 UI
// =============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import type { ScenarioType, ScenarioSubType } from '@/shared/types';
import { SCENARIO_CONFIG } from '@/lib/scenarios/config';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------
interface ScenarioSelectorProps {
  onSelect: (scenarioType: ScenarioType, subType: ScenarioSubType) => void;
  disabled?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export function ScenarioSelector({ onSelect, disabled = false }: ScenarioSelectorProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);

  // 메인 시나리오 선택
  const handleScenarioClick = (scenarioType: ScenarioType) => {
    setSelectedScenario(scenarioType);
  };

  // 서브타입 선택 → 최종 선택 완료
  const handleSubTypeClick = (subType: ScenarioSubType) => {
    if (selectedScenario) {
      onSelect(selectedScenario, subType);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    setSelectedScenario(null);
  };

  // 메인 시나리오 선택 화면
  if (!selectedScenario) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            안녕하세요! 👋
          </h2>
          <p className="text-gray-600">
            어떤 용건으로 전화를 걸어드릴까요?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
          {(Object.entries(SCENARIO_CONFIG) as [ScenarioType, typeof SCENARIO_CONFIG[ScenarioType]][]).map(
            ([type, config]) => (
              <Card
                key={type}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !disabled && handleScenarioClick(type)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-3xl">{config.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  // 서브타입 선택 화면
  const scenarioConfig = SCENARIO_CONFIG[selectedScenario];
  const subTypes = Object.entries(scenarioConfig.subTypes);

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      {/* 헤더 */}
      <div className="w-full max-w-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={disabled}
          className="mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          뒤로
        </Button>
        
        <div className="text-center space-y-2">
          <div className="text-3xl">{scenarioConfig.icon}</div>
          <h2 className="text-xl font-semibold text-gray-900">
            {scenarioConfig.label}
          </h2>
          <p className="text-gray-600">
            어떤 종류인가요?
          </p>
        </div>
      </div>

      {/* 서브타입 버튼 그리드 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {subTypes.map(([subType, subConfig]) => (
          <Card
            key={subType}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !disabled && handleSubTypeClick(subType as ScenarioSubType)}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center min-h-[80px]">
              <h3 className="font-medium text-gray-900">{subConfig.label}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ScenarioSelector;
