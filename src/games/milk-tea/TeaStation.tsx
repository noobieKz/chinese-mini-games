import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Clock3, CupSoda, RotateCcw, X } from 'lucide-react';
import { fields, topics, teaFields, orderControls, type TopicId, type Recipe } from './orders';
import { TeaOrderProgress } from './TeaOrderProgress';
import type { mountTeaScene } from './TeaScene';
import './tea.css';

type Props = {
  topic: TopicId;
  ticket?: string;
  fullOrder?: boolean;
  progress: number;
  results: readonly (boolean | null)[];
  total: number;
  seconds: number;
  score: number;
  opponent?: { name: string; score: number };
  feedback: { correct: boolean; hanzi: string; meaning: string; pinyin?: string } | null;
  onServe(recipe: Recipe): void;
  disabled?: boolean;
  waiting?: boolean;
};

export function TeaStation({
  topic,
  ticket,
  fullOrder = false,
  progress,
  results,
  total,
  seconds,
  score,
  opponent,
  feedback,
  onServe,
  disabled,
  waiting,
}: Props) {
  const { choices, labels, name } = topics[topic];
  const isTea = topic === 'tea';
  const { fields: steps, labels: stepLabels, choices: stepChoices } = orderControls(topic);
  const [stage, setStage] = useState(0);
  const [sealed, setSealed] = useState(false);
  const [teaOnTap, setTeaOnTap] = useState<number | null>(null);
  const [pouring, setPouring] = useState(false);
  const [recipe, setRecipe] = useState<Partial<Recipe>>({});
  const ready = steps.every((key) => recipe[key] !== undefined);
  const [sceneError, setSceneError] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof mountTeaScene> | null>(null);
  const recipeRef = useRef(recipe);
  recipeRef.current = recipe;

  useEffect(() => {
    let active = true;
    import('./TeaScene')
      .then(({ mountTeaScene }) => {
        if (active && host.current)
          scene.current = mountTeaScene(host.current, recipeRef.current, topic);
      })
      .catch(() => {
        if (active) setSceneError(true);
      });
    return () => {
      active = false;
      scene.current?.destroy();
      scene.current = null;
    };
  }, [topic]);

  useLayoutEffect(() => {
    setRecipe({});
    setStage(0);
    setSealed(false);
    setTeaOnTap(null);
    setPouring(false);
  }, [progress, topic, ticket]);
  useEffect(() => {
    scene.current?.update(recipe, sealed);
  }, [recipe, sealed]);
  const correct = feedback?.correct;
  useEffect(() => {
    if (correct) scene.current?.celebrate();
  }, [correct, progress]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      disabled ||
      !ticket ||
      (fullOrder && (!ready || (isTea && !sealed))) ||
      recipe.drink === undefined ||
      recipe.ice === undefined ||
      recipe.sugar === undefined
    )
      return;
    onServe({ ...recipe, drink: recipe.drink, ice: recipe.ice, sugar: recipe.sugar });
  };
  const choosePart = (field: (typeof teaFields)[number], index: number) => {
    const next = { ...recipe, [field]: index };
    setRecipe(next);
    const nextStep = steps.findIndex((key) => next[key] === undefined);
    setStage(nextStep < 0 ? steps.length : nextStep);
  };

  useEffect(() => {
    if (!pouring || teaOnTap === null || disabled || !ticket) return;
    const started = performance.now();
    const cup = { ...recipeRef.current, drink: teaOnTap };
    let frame: number;
    const pour = (now: number) => {
      const fill = Math.min(1, (now - started) / 520);
      scene.current?.update(cup, false, fill);
      if (fill < 1) {
        frame = window.requestAnimationFrame(pour);
        return;
      }
      setRecipe(cup);
      const next = teaFields.findIndex((key) => cup[key] === undefined);
      setStage(next < 0 ? teaFields.length : next);
      setPouring(false);
    };
    frame = window.requestAnimationFrame(pour);
    return () => window.cancelAnimationFrame(frame);
  }, [pouring, teaOnTap, disabled, ticket]);

  const field = steps[stage];
  const inactive = disabled || !ticket;
  const reset = () => {
    setRecipe({});
    setStage(0);
    setSealed(false);
    setTeaOnTap(null);
    setPouring(false);
  };
  return (
    <main className="tea-arena">
      <section className="tea-ticket" aria-label="Yêu cầu tiếng Trung">
        <div className="tea-hud">
          <span>
            <CupSoda size={17} /> {ticket ? `Đơn ${progress + 1}/${total}` : name}
          </span>
          <span>
            <Clock3 size={17} /> {seconds} giây
          </span>
          <strong>{score} đơn đúng</strong>
          {opponent && (
            <span>
              {opponent.name} · {opponent.score} đơn đúng
            </span>
          )}
        </div>
        <p lang={ticket ? 'zh-Hans' : undefined}>
          {ticket ?? (waiting ? 'Đã xử lý hết đơn. Đang chờ kết quả…' : 'Đang chờ bắt đầu')}
        </p>
        <TeaOrderProgress
          total={total}
          results={results}
          submitted={progress}
          active={Boolean(ticket)}
        />
      </section>
      <div className="tea-world" ref={host} aria-hidden="true">
        {sceneError && <CupSoda size={88} />}
      </div>
      {fullOrder ? (
        <form className="tea-controls tea-counter" onSubmit={submit}>
          <nav className="tea-steps" aria-label={isTea ? 'Các bước pha chế' : 'Các bước xử lý đơn'}>
            {steps.map((step, index) => (
              <button
                type="button"
                key={step}
                disabled={
                  inactive ||
                  sealed ||
                  pouring ||
                  (index > stage && recipe[steps[index - 1]] === undefined)
                }
                aria-current={stage === index ? 'step' : undefined}
                onClick={() => setStage(index)}
              >
                {recipe[step] !== undefined ? <Check size={14} aria-hidden="true" /> : index + 1}{' '}
                {stepLabels[step]}
              </button>
            ))}
          </nav>
          {!sealed && stage < steps.length ? (
            <fieldset className="tea-workbench" disabled={inactive || pouring}>
              <legend>{stepLabels[field]}</legend>
              <div>
                {stepChoices[field].map((item, index) => (
                  <button
                    type="button"
                    key={item.hanzi}
                    aria-pressed={
                      (isTea && field === 'drink' ? (teaOnTap ?? recipe.drink) : recipe[field]) ===
                      index
                    }
                    onClick={() => {
                      if (isTea && field === 'drink') setTeaOnTap(index);
                      else choosePart(field, index);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {isTea && field === 'drink' && (
                <button
                  type="button"
                  className="tea-pour"
                  disabled={teaOnTap === null || pouring}
                  onClick={() => setPouring(true)}
                >
                  {pouring ? 'Đang rót…' : 'Rót vào ly'}
                </button>
              )}
            </fieldset>
          ) : null}
          <div className="tea-staging">
            <button
              type="button"
              disabled={inactive || !Object.keys(recipe).length}
              onClick={reset}
            >
              <RotateCcw size={16} aria-hidden="true" /> {isTea ? 'Pha lại' : 'Làm lại'}
            </button>
            {isTea && !sealed ? (
              <button
                key="seal"
                type="button"
                className="tea-serve"
                disabled={inactive || !ready || pouring}
                onClick={() => {
                  setSealed(true);
                  setStage(teaFields.length);
                }}
              >
                Đóng nắp
              </button>
            ) : (
              <button key="serve" type="submit" className="tea-serve" disabled={inactive || !ready}>
                {isTea ? 'Giao ly' : 'Xác nhận'}
              </button>
            )}
          </div>
        </form>
      ) : (
        <form className="tea-controls" onSubmit={submit}>
          {fields.map((field) => (
            <fieldset key={field} disabled={disabled || !ticket}>
              <legend>{labels[field]}</legend>
              <div>
                {choices[field].map((item, index) => (
                  <button
                    key={item.hanzi}
                    type="button"
                    aria-pressed={recipe[field] === index}
                    onClick={() => setRecipe((previous) => ({ ...previous, [field]: index }))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="submit"
            className="tea-serve"
            disabled={disabled || !ticket || fields.some((field) => recipe[field] === undefined)}
          >
            {topic === 'tea' ? 'Giao đơn' : 'Xác nhận'}
          </button>
        </form>
      )}
      <div className="tea-feedback" aria-live="polite">
        {feedback && (
          <>
            {feedback.correct ? <Check size={18} /> : <X size={18} />}
            <span>
              <strong>{feedback.correct ? 'Đúng đơn' : 'Đơn vừa rồi bị sai'}</strong> ·{' '}
              <span lang="zh-Hans">{feedback.hanzi}</span> {feedback.meaning}
              {feedback.pinyin && <small className="tea-pinyin">{feedback.pinyin}</small>}
            </span>
          </>
        )}
      </div>
    </main>
  );
}
